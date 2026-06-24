const { OrderService } = require("../service/order.service");
const { TaskService } = require("../service/task.service");
const { databases, DB_ID } = require("../config/appwrite.config");

const orderSvc = new OrderService();
const taskSvc = new TaskService();
const COLLECTION_TASKS = process.env.APPWRITE_COLLECTION_TASKS;

async function receiveOrderHandler(context) {
    const { payload, res, log } = context;
    const { taskId, commission } = payload;

    if (!taskId) {
        return res.json({ success: false, message: "Thiếu mã chiến dịch (taskId)" }, 400);
    }

    const userId = context.userId;

    try {
        const existingOrder = await orderSvc.findActiveOrder(userId, taskId);
        if (existingOrder) {
            return res.json({
                success: false,
                message: "Bạn đang có một phiên thực hiện chiến dịch này chưa hoàn tất."
            }, 400);
        }

        // 3. Đọc dữ liệu Task từ Database xem còn suất không
        // Giả sử taskSvc của bạn đã có hàm lấy chi tiết bằng ID, nếu chưa có hãy dùng thẳng dữ liệu Appwrite bên dưới:
        const task = await databases.getDocument(DB_ID, COLLECTION_TASKS, taskId);

        if (!task || task.status !== "available" || task.remainingQuantity <= 0) {
            return res.json({
                success: false,
                message: "Chiến dịch này đã hết suất hoặc đã tạm dừng phát hành."
            }, 400);
        }

        // 4. TIẾN HÀNH TRỪ SUẤT (Lock suất ngầm trong 15 phút)
        // Cập nhật giảm suất còn lại của Task đi 1 đơn vị
        await databases.updateDocument(DB_ID, COLLECTION_TASKS, taskId, {
            remainingQuantity: task.remainingQuantity - 1
        });

        // 5. KHỞI TẠO ĐƠN HÀNG MỚI (Đồng bộ 100% cấu trúc ảnh Database của bạn)
        const orderPayload = {
            taskId: taskId,
            userId: userId,
            status: "in_progress", // Trạng thái khởi tạo: Đang thực hiện
            commission: Number(commission) || Number(task.commission) || 0,
            createdAt: new Date().toISOString(),

            // Các trường mặc định rỗng chờ User submit minh chứng ở bước sau
            trackingCode: "",
            proofImage: "",
            purchasePrice: 0,
            submittedAt: null,
            approvedAt: null
        };

        const newOrder = await orderSvc.createOrder(orderPayload);

        log(`[Backend Order] User ${userId} đã nhận thành công Task ${taskId}. OrderID: ${newOrder.$id}`);

        return res.json({
            success: true,
            message: "Nhận đơn thành công! Bạn có 15 phút để thực hiện và khai báo minh chứng.",
            orderId: newOrder.$id,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // Gửi thêm thời gian hết hạn về cho Frontend đếm ngược
        }, 201);

    } catch (err) {
        console.error("Lỗi xử lý nhận đơn:", err.message || err);
        return res.json({
            success: false,
            message: err.message || "Hệ thống gặp sự cố khi xử lý ghi nhận đơn hàng.",
        }, 500);
    }
}


async function submitProofHandler(context) {
    const { payload, res } = context;
    const { orderId, trackingCode, proofImage, purchasePrice } = payload;

    try {
        // 1. Lấy thông tin đơn hàng hiện tại lên để đối soát
        const order = await databases.getDocument(DB_ID, COLLECTION_ORDERS, orderId);

        // 🚨 2. CHÈN LOGIC KIỂM TRA 15 PHÚT VÀO NGAY ĐÂY:
        const timeDiff = Date.now() - new Date(order.createdAt).getTime();
        const fifteenMinutes = 15 * 60 * 1000;

        if (order.status === "in_progress" && timeDiff > fifteenMinutes) {
            // Hoàn suất lại cho Task vì quá hạn
            const task = await databases.getDocument(DB_ID, COLLECTION_TASKS, order.taskId);
            await databases.updateDocument(DB_ID, COLLECTION_TASKS, order.taskId, {
                remainingQuantity: task.remainingQuantity + 1
            });

            // Chuyển trạng thái đơn sang expired
            await databases.updateDocument(DB_ID, COLLECTION_ORDERS, orderId, {
                status: "expired"
            });

            return res.json({
                success: false,
                message: "Phiên làm việc đã quá 15 phút. Đơn hàng đã bị hệ thống hủy tự động."
            }, 400);
        }

        // 3. Nếu chưa quá hạn (Hợp lệ) -> Tiến hành cập nhật minh chứng như bình thường
        const updatedOrder = await databases.updateDocument(DB_ID, COLLECTION_ORDERS, orderId, {
            trackingCode,
            proofImage,
            purchasePrice: Number(purchasePrice),
            status: "pending_review", // Chuyển sang chờ admin duyệt
            submittedAt: new Date().toISOString()
        });

        return res.json({ success: true, message: "Nộp minh chứng thành công! Vui lòng chờ đối soát." });

    } catch (err) {
        return res.json({ success: false, message: err.message }, 500);
    }
}

async function getUserOrdersHandler(context) {
    const { res } = context;
    const userId = context.userId;

    try {
        // 1. Lấy danh sách đơn hàng của User này từ DB lên trước
        const response = await databases.listDocuments(DB_ID, COLLECTION_ORDERS, [
            Query.equal("userId", userId)
        ]);

        const orders = response.documents;
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        // 🚨 2. DUYỆT QUA MẢNG ĐỂ CẬP NHẬT NGẦM CÁC ĐƠN ĐÃ QUÁ HẠN
        for (let order of orders) {
            const timeDiff = now - new Date(order.createdAt).getTime();

            if (order.status === "in_progress" && timeDiff > fifteenMinutes) {
                // Đổi trạng thái biến tạm để trả về client thấy ngay lập tức
                order.status = "expired";

                // Chạy lệnh update ngầm xuống Database mà không cần await bắt client đợi lâu
                taskSvc.list().then(async () => { // Giả lập chạy background
                    const task = await databases.getDocument(DB_ID, COLLECTION_TASKS, order.taskId);
                    await databases.updateDocument(DB_ID, COLLECTION_TASKS, order.taskId, {
                        remainingQuantity: task.remainingQuantity + 1
                    });
                    await databases.updateDocument(DB_ID, COLLECTION_ORDERS, order.$id, {
                        status: "expired"
                    });
                }).catch(e => console.error("Lỗi update expired ngầm:", e));
            }
        }

        // 3. Trả dữ liệu sạch về cho Frontend hiển thị
        return res.json({ success: true, orders: orders });

    } catch (err) {
        return res.json({ success: false, message: err.message }, 500);
    }
}

module.exports = {
    receiveOrderHandler,
    submitProofHandler,
    getUserOrdersHandler
};