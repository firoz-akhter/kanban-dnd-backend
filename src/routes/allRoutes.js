const express = require("express");
const router = express.Router();
const {
  getTasks,
  getBoardColumns,
  addColumn,
  deleteColumn,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  createBoard,
  register,
  login,
} = require("../controllers/controllers"); // Adjust path as needed

router.post("/createBoard", createBoard);
router.post("/addColumn/:boardId", addColumn);
router.delete("/deleteColumn/:columnId/:boardId", deleteColumn);
router.post("/createTask/:columnId", createTask);
router.get("/getTasks", getTasks);
router.get("/getBoardColumns/:boardId", getBoardColumns);
router.patch("/updateTask/:taskId/:columnId", updateTask);
router.patch("/moveTask/:taskId/:oldColumnId/:newColumnId/:position", moveTask);
router.delete("/deleteTask/:taskId/:columnId", deleteTask);
router.get("/testing", (req, res) =>
  res.json({ message: "Testing in postman" })
);
router.post("/auth/register", register);
router.post("/auth/login", login);

module.exports = router;
