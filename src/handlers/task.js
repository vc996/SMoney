const { TaskService } = require("../service/task.service");
const taskSvc = new TaskService();

async function createTaskHandler(context) {
    const { payload, res } = context;

    if (!payload || !payload.sku) {
        return res.json({
            success: false,
            message: "SKU không được để trống",
        }, 400);
    }

    try {
        const importPrice = Number(payload.importPrice);
        const commission = Number(payload.commission);
        const totalQuantity = Number(payload.totalQuantity);

        // Tạo object data map chuẩn với database của bạn
        const taskData = {
            sku: payload.sku.trim().toUpperCase(),
            title: payload.title || "Chưa có tiêu đề",
            category: payload.category || "General",

            // TRƯỜNG LỖI: Hãy chắc chắn cột trên Appwrite viết giống hệt chữ này
            description: payload.description || "",

            importPrice: isNaN(importPrice) ? 0 : importPrice,
            commission: isNaN(commission) ? 0 : commission,
            totalQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            remainingQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            status: "available",
            createdBy: payload.userId || "system",
            createdAt: new Date().toISOString(),
        };

        if (payload.image && payload.image.trim() !== "") {
            taskData.image = payload.image;
        }

        // Thực hiện ghi vào DB
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
                message: "SKU này đã tồn tại trên hệ thống",
            }, 409);
        }

        // Trả ra lỗi chi tiết để frontend dễ nhìn
        return res.json({
            success: false,
            message: err.message || "Database error",
        }, 500);
    }
}

module.exports = {
    createTaskHandler,
};