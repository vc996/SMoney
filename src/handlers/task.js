const { TaskService } = require("../service/task.service");

const taskSvc = new TaskService();

async function createTaskHandler(context) {

    const { payload, res } = context;


    try {

        const task = await taskSvc.create({

            sku: payload.sku.trim().toUpperCase(),

            title: payload.title,

            category: payload.category,

            description: payload.description,

            importPrice: Number(payload.importPrice),

            commission: Number(payload.commission),

            totalQuantity: Number(payload.totalQuantity),

            remainingQuantity: Number(payload.totalQuantity),

            status: "available",

            createdBy: payload.userId,

            createdAt: new Date().toISOString(),

        });

        return res.json({

            success: true,

            taskId: task.$id,

        }, 201);

    } catch (err) {

        if (err.code === 409) {

            return res.json({

                success: false,

                message: "SKU đã tồn tại",

            }, 409);

        }

        return res.json({

            success: false,

            message: "Database error",

        }, 500);

    }

}

module.exports = {
    createTaskHandler,
};