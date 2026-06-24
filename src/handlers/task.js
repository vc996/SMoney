const { TaskService } = require("../service/task.service");
const taskSvc = new TaskService();

async function createTaskHandler(context) {
    const { payload, res, log } = context;

    if (!payload || !payload.sku) {
        return res.json({
            success: false,
            message: "SKU không được để trống",
        }, 400);
    }

    // 2. Lấy ID người tạo chuẩn từ Middleware JWT đã đính kèm vào context ở bước trước
    const currentUserId = context.userId || "system";

    try {
        const importPrice = Number(payload.importPrice);
        const commission = Number(payload.commission);
        const totalQuantity = Number(payload.totalQuantity);

        const taskData = {
            sku: payload.sku.trim().toUpperCase(),
            title: payload.title?.trim() || "Chưa có tiêu đề",
            category: payload.category?.trim() || "General",
            description: payload.description?.trim() || "",

            importPrice: isNaN(importPrice) ? 0 : importPrice,
            commission: isNaN(commission) ? 0 : commission,
            totalQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,

            remainingQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            status: "available",

            createdBy: currentUserId,
            createdAt: new Date().toISOString(),

            image: payload.image ? payload.image.trim() : "",
        };

        if (process.env.NODE_ENV !== 'production') {
            log(`[Backend Task Handler] Dữ liệu chuẩn bị insert vào DB: ${JSON.stringify(taskData)}`);
        }

        const task = await taskSvc.create(taskData);

        return res.json({
            success: true,
            taskId: task.$id,
            message: "Tạo chiến dịch thành công!"
        }, 201);

    } catch (err) {
        console.error(err.message || err);

        if (err.code === 409 || err.status === 409) {
            return res.json({
                success: false,
                message: "Mã kiểm kê (SKU) này đã tồn tại trên hệ thống.",
            }, 409);
        }

        return res.json({
            success: false,
            message: err.message || "Lỗi lưu trữ dữ liệu hệ thống.",
        }, 500);
    }
}

async function getTasksHandler(context) {
    const { res, log } = context;

    try {
        const taskList = await taskSvc.list();

        if (process.env.NODE_ENV !== 'production') {
            log(`[Backend Task Handler] Đã lấy thành công ${taskList.documents.length} tasks.`);
        }

        return res.json({
            success: true,
            tasks: taskList.documents, // Trả về mảng danh sách các Document Task
            total: taskList.total
        }, 200);

    } catch (err) {
        console.error("Lỗi lấy danh sách task:", err.message || err);
        return res.json({
            success: false,
            message: err.message || "Không thể tải danh sách dữ liệu từ hệ thống.",
        }, 500);
    }
}

module.exports = {
    createTaskHandler,
    getTasksHandler
};