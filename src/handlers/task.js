const { TaskService } = require("../service/task.service");
const taskSvc = new TaskService();

async function createTaskHandler(context) {
    const { payload, res, log } = context;

    // 1. Kiểm tra payload hợp lệ gửi từ client
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

        // 3. Chuẩn hóa payload đồng bộ 100% với cấu hình Database
        const taskData = {
            sku: payload.sku.trim().toUpperCase(),
            title: payload.title?.trim() || "Chưa có tiêu đề",
            category: payload.category?.trim() || "General",
            description: payload.description?.trim() || "",

            // Ép kiểu số nguyên tránh lỗi định dạng
            importPrice: isNaN(importPrice) ? 0 : importPrice,
            commission: isNaN(commission) ? 0 : commission,
            totalQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,

            // Tự động gán số suất còn lại bằng tổng số suất khi vừa tạo
            remainingQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            status: "available",

            // Chốt khóa người tạo an toàn
            createdBy: currentUserId,
            createdAt: new Date().toISOString(),

            // 🎯 SỬA LỖI IMAGE: Giữ thuộc tính image trong mọi trường hợp (Dù rỗng hay có link)
            // Vì cấu hình bảng của bạn bắt buộc có trường này, không được phép khuyết key.
            image: payload.image ? payload.image.trim() : "",
        };

        if (process.env.NODE_ENV !== 'production') {
            log(`[Backend Task Handler] Dữ liệu chuẩn bị insert vào DB: ${JSON.stringify(taskData)}`);
        }

        // Tiến hành ghi nhận vào Database thông qua service của bạn
        const task = await taskSvc.create(taskData);

        return res.json({
            success: true,
            taskId: task.$id,
            message: "Tạo chiến dịch thành công!"
        }, 201);

    } catch (err) {
        console.error(err.message || err);

        // Bắt lỗi trùng lặp SKU (Trùng Index trong Appwrite)
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

module.exports = {
    createTaskHandler,
};