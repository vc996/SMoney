// ── 1. ĐỔI SANG CÚ PHÁP CŨ (COMMONJS) ──
const { databases, DB_ID, COLLECTION_TASKS, ID } = require("../config/appwrite");

async function createTaskHandler(context) {
    const { payload, res, log, error } = context;

    try {
        // Dữ liệu payload đã được bóc tách và giải mã JSON sạch sẽ tại file main.js/index.js
        const { sku, title, category, description, importPrice, commission, totalQuantity } = payload;

        // Gọi trực tiếp thực thể databases được nhúng từ file cấu hình dùng chung
        const task = await databases.createDocument(
            DB_ID,
            COLLECTION_TASKS,
            ID.unique(),
            {
                sku: sku.trim().toUpperCase(),
                title: title.trim(),
                category: category.trim(),
                description: description.trim(),
                importPrice: parseInt(importPrice),
                commission: parseInt(commission),
                totalQuantity: parseInt(totalQuantity),
                remainingQuantity: parseInt(totalQuantity),
                status: "available",
                createdBy: payload?.userId || "admin_system", // ID do middleware inject vào payload
                createdAt: new Date().toISOString()
            }
        );

        log(`[SUCCESS] Đã khởi tạo chiến dịch thành công | SKU: ${sku}`);

        return res.json({
            success: true,
            message: `Khởi tạo chiến dịch [${sku}] trên hệ thống Cloud hoàn tất!`,
            taskId: task.$id
        }, 201);

    } catch (err) {
        error(`[ERROR] Thất bại tại createTaskHandler: ${err.message}`);

        // Bắt lỗi trùng lặp Unique Index (Mã SKU đã tồn tại) từ Appwrite
        if (err.code === 409) {
            return res.json({ success: false, message: "Mã kiểm kê SKU này đã tồn tại trên tổng kho!" }, 409);
        }

        return res.json({ success: false, message: "Lỗi đồng bộ cơ sở dữ liệu hệ thống." }, 500);
    }
}

// ── 2. XUẤT HÀM THEO KIỂU CŨ ──
module.exports = { createTaskHandler };