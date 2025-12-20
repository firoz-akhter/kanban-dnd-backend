const { Column, Board, Task, User } = require("../models/models");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addBoard = async (boardName = "Initial Board", userId = null) => {
  try {
    const newBoard = new Board({
      $id: uuidv4(),
      $createdAt: new Date().toISOString(),
      boardName,
      columns: [],
      userId: userId, // Optional: associate board with user
    });

    await newBoard.save();
    return { success: true, board: newBoard };
  } catch (error) {
    console.error("Error creating board:", error);
    return { success: false, error: error.message };
  }
};

// Controller for creating board via API
const createBoard = async (req, res) => {
  try {
    let { boardName } = req.body;

    // Default board name if not provided
    if (!boardName) {
      boardName = "Initial Board";
    }

    const result = await addBoard(boardName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    }

    res.status(201).json({
      success: true,
      message: "Board created successfully",
      data: result.board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all tasks from database
const getTasks = async (req, res) => {
  try {
    const columns = await Column.find();
    const allTodos = [];

    columns.forEach((column) => {
      allTodos.push(...column.todos);
    });

    res.status(200).json({
      success: true,
      count: allTodos.length,
      data: allTodos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBoardColumns = async (req, res) => {
  try {
    const { boardId } = req.params;
    // console.log("boardId", boardId);
    // return;
    const columns = await Column.find({ boardId });
    // const allTodos = [];

    // columns.forEach((column) => {
    //   allTodos.push(...column.todos);
    // });

    res.status(200).json({
      success: true,
      // count: allTodos.length,
      data: columns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a new column to a board
const addColumn = async (req, res) => {
  // console.log("hitting end point");
  try {
    const { boardId } = req.params;
    // manually adding all columns in a single board, will fix it later
    // boardId = "69317058536abc4e80038c55";
    const { columnName } = req.body;
    // console.log(boardId, columnName);

    if (!columnName) {
      return res.status(400).json({
        success: false,
        message: "Column name is required",
      });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Create new column
    const newColumn = new Column({
      $id: uuidv4(),
      $createdAt: new Date().toISOString(),
      columnName,
      boardId: boardId,
      todos: [],
    });

    await newColumn.save();

    // Add column reference to board
    board.columns.push(newColumn._id);
    await board.save();

    res.status(201).json({
      success: true,
      message: "Column added successfully",
      data: newColumn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a column from a board
const deleteColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const column = await Column.findById(columnId);

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    // Check if column has tasks
    if (column.todos.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete column with existing tasks. Please move or delete tasks first.",
      });
    }

    // Remove column reference from board
    board.columns = board.columns.filter((col) => col.toString() !== columnId);
    await board.save();

    // Delete the column
    await Column.findByIdAndDelete(columnId);

    res.status(200).json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new task
const createTask = async (req, res) => {
  // console.log("trying to create new task");
  // return;
  try {
    const { columnId } = req.params;
    const { title, status, description, priority, dueDate, columnName } =
      req.body;

    // console.log({ columnId, title, status, description, priority, dueDate });
    // return res.send({
    //   columnId,
    //   title,
    //   status,
    //   description,
    //   priority,
    //   dueDate,
    //   columnName,
    // });

    if (!title || !status || !columnId) {
      return res.status(400).json({
        success: false,
        message: "Title, status, and columnId are required",
      });
    }

    // const board = await Board.findById(boardId);

    // if (!board) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Board not found",
    //   });
    // }

    const column = await Column.findById(columnId);

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    // Create new task object
    const newTask = new Task({
      $id: uuidv4(),
      $createdAt: new Date().toISOString(),
      title: title.trim(),
      status,
      description,
      priority,
      dueDate,
      columnName,
      columnId,
    });

    // we are saving newTask at two places one as model data and secondly pushing in columns modal
    await newTask.save();

    // Add task directly to column
    column.todos.push(newTask);
    await column.save();

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: newTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  // console.log("inside updateTask");
  // return;
  try {
    const { taskId, columnId } = req.params;
    const {
      title,
      status,
      description,
      priority,
      dueDate,
      newColumnId,
      newColumnName,
    } = req.body;

    // Find the task in Task collection
    const task = await Task.findById(taskId);

    // return res.send(task);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in database...",
      });
    }

    // Find the current column (from params)
    const currentColumn = await Column.findById(columnId);

    if (!currentColumn) {
      return res.status(404).json({
        success: false,
        message: "Current column not found",
      });
    }

    // Find the task in current column's todos
    const taskIndex = currentColumn.todos.findIndex(
      (t) => t._id.toString() === taskId
    );

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Task not found in column",
      });
    }

    // Update task fields in Task model
    if (title) task.title = title.trim();
    if (status) task.status = status;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (newColumnName !== undefined) task.columnName = newColumnName;

    // If moving to a different column
    if (newColumnId && newColumnId !== columnId) {
      const newColumn = await Column.findById(newColumnId);

      if (!newColumn) {
        return res.status(404).json({
          success: false,
          message: "Target column not found",
        });
      }

      // Update columnId and columnName in Task model
      task.columnId = newColumnId;
      task.columnName = newColumn.columnName;

      // Update the embedded task in current column's todos
      const embeddedTask = currentColumn.todos[taskIndex];
      if (title) embeddedTask.title = title.trim();
      if (status) embeddedTask.status = status;
      if (description !== undefined) embeddedTask.description = description;
      if (priority !== undefined) embeddedTask.priority = priority;
      if (dueDate !== undefined) embeddedTask.dueDate = dueDate;
      if (newColumnName !== undefined) embeddedTask.columnName = newColumnName;

      // Remove from current column
      currentColumn.todos.splice(taskIndex, 1);
      await currentColumn.save();

      // Add to new column with updated data
      newColumn.todos.push({
        $id: task.$id,
        $createdAt: task.$createdAt,
        title: task.title,
        status: task.status,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        columnName: newColumn.columnName,
        columnId: newColumnId,
      });
      await newColumn.save();
    } else {
      // Update in place (same column)
      const embeddedTask = currentColumn.todos[taskIndex];
      if (title) embeddedTask.title = title.trim();
      if (status) embeddedTask.status = status;
      if (description !== undefined) embeddedTask.description = description;
      if (priority !== undefined) embeddedTask.priority = priority;
      if (dueDate !== undefined) embeddedTask.dueDate = dueDate;

      await currentColumn.save();
    }

    // Save updated Task model
    await task.save();

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const moveTask = async (req, res) => {
//   try {
//     const { taskId, oldColumnId, newColumnId, position } = req.params;

//     // Validate if moving to same column
//     if (oldColumnId === newColumnId) {
//       return res.status(400).json({
//         success: false,
//         message: "Task is already in this column",
//       });
//     }

//     // Find the task in Task collection
//     const task = await Task.findById(taskId);

//     if (!task) {
//       return res.status(404).json({
//         success: false,
//         message: "Task not found",
//       });
//     }

//     // Find the old column
//     const oldColumn = await Column.findById(oldColumnId);

//     if (!oldColumn) {
//       return res.status(404).json({
//         success: false,
//         message: "Old column not found",
//       });
//     }

//     // Find the new column
//     const newColumn = await Column.findById(newColumnId);

//     if (!newColumn) {
//       return res.status(404).json({
//         success: false,
//         message: "New column not found",
//       });
//     }

//     // Find task index in old column
//     const taskIndex = oldColumn.todos.findIndex(
//       (t) => t._id.toString() === taskId
//     );

//     if (taskIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: "Task not found in old column",
//       });
//     }

//     // Remove task from old column
//     oldColumn.todos.splice(taskIndex, 1);
//     await oldColumn.save();

//     // Update task's columnId and columnName in Task model
//     task.columnId = newColumnId;
//     task.columnName = newColumn.columnName;
//     task.status = newColumn.columnName; // Update status to match new column
//     await task.save();

//     // Add task to new column
//     newColumn.todos.push({
//       $id: task.$id,
//       $createdAt: task.$createdAt,
//       _id: task._id,
//       title: task.title,
//       status: newColumn.columnName,
//       description: task.description,
//       priority: task.priority,
//       dueDate: task.dueDate,
//       columnName: newColumn.columnName,
//       columnId: newColumnId,
//     });
//     await newColumn.save();

//     res.status(200).json({
//       success: true,
//       message: "Task moved successfully",
//       data: {
//         task,
//         oldColumn: oldColumn.columnName,
//         newColumn: newColumn.columnName,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

const moveTask = async (req, res) => {
  try {
    const { taskId, oldColumnId, newColumnId, position } = req.params;

    // Validate if moving to same column
    if (oldColumnId === newColumnId) {
      return res.status(400).json({
        success: false,
        message: "Task is already in this column",
      });
    }

    // Find the task in Task collection
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Find the old column
    const oldColumn = await Column.findById(oldColumnId);

    if (!oldColumn) {
      return res.status(404).json({
        success: false,
        message: "Old column not found",
      });
    }

    // Find the new column
    const newColumn = await Column.findById(newColumnId);

    if (!newColumn) {
      return res.status(404).json({
        success: false,
        message: "New column not found",
      });
    }

    // Find task index in old column
    const taskIndex = oldColumn.todos.findIndex(
      (t) => t._id.toString() === taskId
    );

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Task not found in old column",
      });
    }

    // Remove task from old column
    oldColumn.todos.splice(taskIndex, 1);
    await oldColumn.save();

    // Update task's columnId and columnName in Task model
    task.columnId = newColumnId;
    task.columnName = newColumn.columnName;
    task.status = newColumn.columnName; // Update status to match new column
    await task.save();

    // Prepare task object to insert
    const taskToInsert = {
      $id: task.$id,
      $createdAt: task.$createdAt,
      _id: task._id,
      title: task.title,
      status: newColumn.columnName,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      columnName: newColumn.columnName,
      columnId: newColumnId,
    };

    // Parse position and handle edge cases
    const insertPosition = parseInt(position);
    // console.log("insertPosition", insertPosition);

    if (insertPosition === -1 || insertPosition >= newColumn.todos.length) {
      // If position is -1 or greater than array length, add to end
      newColumn.todos.push(taskToInsert);
    } else if (insertPosition <= 0) {
      // If position is 0 or negative, add to beginning
      newColumn.todos.unshift(taskToInsert);
    } else {
      // Insert at specific position
      newColumn.todos.splice(insertPosition, 0, taskToInsert);
    }

    await newColumn.save();

    res.status(200).json({
      success: true,
      message: "Task moved successfully",
      data: {
        task,
        oldColumn: oldColumn.columnName,
        newColumn: newColumn.columnName,
        position: insertPosition,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const moveTask = async (req, res) => {
//   try {
//     const { taskId, oldColumnId, newColumnId, position } = req.params;

//     // Find the task in Task collection
//     const task = await Task.findById(taskId);

//     if (!task) {
//       return res.status(404).json({
//         success: false,
//         message: "Task not found",
//       });
//     }

//     // Find the old column
//     const oldColumn = await Column.findById(oldColumnId);

//     if (!oldColumn) {
//       return res.status(404).json({
//         success: false,
//         message: "Old column not found",
//       });
//     }

//     // Find task index in old column
//     const taskIndex = oldColumn.todos.findIndex(
//       (t) => t._id.toString() === taskId
//     );

//     if (taskIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: "Task not found in old column",
//       });
//     }

//     // Parse position
//     const insertPosition = parseInt(position);
//     console.log("insertPosition", insertPosition);

//     // Handle same column reordering
//     if (oldColumnId === newColumnId) {
//       // Remove task from current position
//       const [movedTask] = oldColumn.todos.splice(taskIndex, 1);

//       // Insert at new position
//       if (insertPosition === -1 || insertPosition >= oldColumn.todos.length) {
//         // Add to end
//         oldColumn.todos.push(movedTask);
//       } else if (insertPosition <= 0) {
//         // Add to beginning
//         oldColumn.todos.unshift(movedTask);
//       } else {
//         // Insert at specific position
//         oldColumn.todos.splice(insertPosition, 0, movedTask);
//       }

//       await oldColumn.save();

//       return res.status(200).json({
//         success: true,
//         message: "Task reordered successfully",
//         data: {
//           task,
//           column: oldColumn.columnName,
//           oldPosition: taskIndex,
//           newPosition: insertPosition,
//         },
//       });
//     }

//     // Handle moving to different column
//     const newColumn = await Column.findById(newColumnId);

//     if (!newColumn) {
//       return res.status(404).json({
//         success: false,
//         message: "New column not found",
//       });
//     }

//     // Remove task from old column
//     oldColumn.todos.splice(taskIndex, 1);
//     await oldColumn.save();

//     // Update task's columnId and columnName in Task model
//     task.columnId = newColumnId;
//     task.columnName = newColumn.columnName;
//     task.status = newColumn.columnName;
//     await task.save();

//     // Prepare task object to insert
//     const taskToInsert = {
//       $id: task.$id,
//       $createdAt: task.$createdAt,
//       _id: task._id,
//       title: task.title,
//       status: newColumn.columnName,
//       description: task.description,
//       priority: task.priority,
//       dueDate: task.dueDate,
//       columnName: newColumn.columnName,
//       columnId: newColumnId,
//     };

//     // Insert at position in new column
//     if (insertPosition === -1 || insertPosition >= newColumn.todos.length) {
//       newColumn.todos.push(taskToInsert);
//     } else if (insertPosition <= 0) {
//       newColumn.todos.unshift(taskToInsert);
//     } else {
//       newColumn.todos.splice(insertPosition, 0, taskToInsert);
//     }

//     await newColumn.save();

//     res.status(200).json({
//       success: true,
//       message: "Task moved successfully",
//       data: {
//         task,
//         oldColumn: oldColumn.columnName,
//         newColumn: newColumn.columnName,
//         position: insertPosition,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

const deleteTask = async (req, res) => {
  // console.log("testing branch switch ");
  try {
    const { columnId, taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const column = await Column.findById(columnId);

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    column.todos = column.todos.filter((col) => col._id.toString() !== taskId);
    await column.save();

    // delete task
    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      success: true,
      message: "task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// async function register(req, res) {
//   // let userId = req.user._id;
//   let { username, email, password } = req.body;
//   // console.log("upcoming data", username, email, password);
//   // return;

//   if (!username || !email || !password) {
//     res.status(400).json({
//       success: false,
//       message: "Either one or more required fields are missing...",
//     });
//     return;
//   }

//   try {
//     let existingUser = await User.findOne({ email });
//     if (existingUser) {
//       res.status(409).json({
//         success: false,
//         message: "Email already exists...",
//       });
//       return;
//     }

//     // here we will add one board and then add board id to newUser

//     let hashedPassword = await bcrypt.hash(password, 10); // check once more
//     let newUser = new User({
//       username,
//       email,
//       password: hashedPassword,
//       boardId: "",
//     });
//     console.log("after", newUser);

//     await newUser.save();

//     newUser = newUser.toObject();
//     // let token = jwt.sign(newUser, process.env.SECRET_KEY)
//     // newUser.token = token;

//     delete newUser.password;
//     res.status(200).json(newUser);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong while registering new User",
//     });
//   }
// }

// const createBoard = async (req, res) => {
//   try {
//     const { boardName } = req.body;
//     console.log({ boardName });

//     if (!boardName) boardName = "Initial Board";

//     if (!boardName) {
//       return res.status(400).json({
//         success: false,
//         message: "Board name is required",
//       });
//     }

//     const newBoard = new Board({
//       $id: uuidv4(),
//       $createdAt: new Date().toISOString(),
//       boardName,
//       columns: [],
//     });

//     await newBoard.save();

//     res.status(201).json({
//       success: true,
//       message: "Board created successfully",
//       data: newBoard,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// aut controllers

async function register(req, res) {
  let { username, email, password } = req.body;

  // console.log("inside register");
  // return;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Either one or more required fields are missing...",
    });
  }

  try {
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists...",
      });
    }

    let hashedPassword = await bcrypt.hash(password, 10);

    const boardResult = await addBoard("My First Board");
    if (!boardResult.success) {
      console.log(err);
      res.status(500).json({
        success: false,
        message: "Something went wrong while adding new board",
      });
    }
    // console.log("boardId,,", boardResult.board._id);

    // Create a new user first
    let newUser = new User({
      username,
      email,
      password: hashedPassword,
      boardId: boardResult.board._id, // Will be updated after board creation
    });

    await newUser.save();

    // Create a board for the new user

    if (boardResult.success) {
      // Update user with the board ID
      newUser.boardId = boardResult.board._id;
      await newUser.save();
    } else {
      console.error("Failed to create board for user:", boardResult.error);
      // Optionally: rollback user creation or handle error
    }

    // Prepare response
    newUser = newUser.toObject();
    delete newUser.password;

    res.status(200).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
      board: boardResult.success ? boardResult.board : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong while registering new User",
    });
  }
}

async function login(req, res) {
  let { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Email and password both required...",
    });
    return;
  }
  try {
    // finding saved user by email
    // res.send("finding the user with email"); return ;
    let user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User with email or password not found...",
      });
      return;
    }

    // check password is correct or not
    let isValidPassword = await bcrypt.compare(password, user.password); // check one more
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password...",
      });
      return;
    }
    // console.log("validPassword", isValidPassword);
    // console.log("after user", user);

    // generate token
    let token = jwt.sign(
      {
        user,
      },
      process.env.SECRET_KEY
    );

    user = user.toObject();
    delete user.password;
    user.token = token;

    // return token
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
}

module.exports = {
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
};
