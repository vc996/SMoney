const { TaskService } = require("../service/task.service");

const taskSvc = new TaskService();

async function createTaskHandler(context) {
    const { payload, res } = context;

    // 1. Kiểm tra an toàn trước khi trim() để tránh crash server
    if (!payload || !payload.sku) {
        return res.json({
            success: false,
            message: "SKU không được để trống",
        }, 400);
    }

    try {
        // 2. Chuẩn hóa dữ liệu đầu vào, ép về 0 nếu frontend gửi thiếu/sai để tránh lỗi NaN
        const importPrice = Number(payload.importPrice);
        const commission = Number(payload.commission);
        const totalQuantity = Number(payload.totalQuantity);

        const taskData = {
            sku: payload.sku.trim().toUpperCase(),
            title: payload.title || "Chưa có tiêu đề",
            category: payload.category || "General",
            description: payload.description || "",
            importPrice: isNaN(importPrice) ? 0 : importPrice,
            commission: isNaN(commission) ? 0 : commission,
            totalQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            remainingQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            status: "available",
            createdBy: payload.userId || "system", // Đảm bảo không bị trống trường Required
            createdAt: new Date().toISOString(), // Nếu vẫn lỗi 500, hãy thử đổi dòng này thành: new Date()
        };

        // Chỉ thêm trường image nếu nó là một URL hợp lệ (không gửi chuỗi rỗng)
        if (payload.image && payload.image.trim() !== "") {
            taskData.image = payload.image;
        }

        // 3. Gọi Service tạo Task
        const task = await taskSvc.create(taskData);

        return res.json({
            success: true,
            taskId: task.$id,
        }, 201);

    } catch (err) {
        // QUAN TRỌNG: In lỗi thực tế ra Terminal/Console để xem chính xác Appwrite đang chê trường nào
        console.error("--- APPWRITE DATABASE ERROR ---");
        console.error(err);
        console.error("-------------------------------");

        // Bắt lỗi trùng SKU (Appwrite thường trả về code 409 khi trùng Unique Index)
        if (err.code === 409 || err.status === 409) {
            return res.json({
                success: false,
                message: "SKU đã tồn tại trong hệ thống",
            }, 409);
        }

        // Trả về thông báo lỗi chi tiết từ DB thay vì chữ "Database error" chung chung
        return res.json({
            success: false,
            message: err.message || "Database error",
        }, err.code >= 400 && err.code < 600 ? err.code : 500);
    }
}

module.exports = {
    createTaskHandler,
};