const db = require('../db');

module.exports = {
  async findAll() {
    let tasks = await db.query(`
    SELECT * 
    FROM tasks
    `);
    return tasks.rows;
  },

  async findByListId(listId, all) {
    let tasks = await db.query(`
    SELECT name, description, done, due_date 
    FROM tasks
    WHERE list_id = $1 AND (done=false OR done=$2)
    `, [listId, all])
    return tasks.rows;
  },


  async findOneById(taskId) {
    let task = await db.query(`SELECT * FROM tasks WHERE id=$1`, [taskId]);
    return task.rows;
  },

  async findDashboard() {
    let allTasks = await db.query(`
      SELECT COUNT(*) AS today
      FROM tasks 
      WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE::TIMESTAMP + INTERVAL '23:59:59'
    `);
    let groupedTasks = await db.query(`
    SELECT *
    FROM (
      SELECT list_id as id, name, undone
      FROM (
        SELECT list_id, COUNT(*) as undone
        FROM (    
          SELECT id, list_id, done
          FROM tasks 
          WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE::TIMESTAMP + INTERVAL '23:59:59'
        ) as todayTable
        WHERE done=false
        GROUP BY list_id
      ) as unDoneTodayTable
      RIGHT JOIN lists
      ON unDoneTodayTable.list_id = lists.id
    ) as lists
    `)
    await Promise.all([allTasks.rows[0], allTasks.rows[0]['lists']=groupedTasks.rows]);
    return allTasks.rows[0];
  },

  async findToday() {
    let todayTasks = await db.query(`
    SELECT tasks.id as task_id, tasks.name as task_name, description, done, due_date, lists.name as list_name, lists.id as list_id
    FROM tasks 
    RIGHT JOIN lists
    ON tasks.list_id = lists.id
    WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE::TIMESTAMP + INTERVAL '23:59:59'
    `)
    return todayTasks.rows
  },

  async create(task) {
    let newTask = await db.query(`
      INSERT INTO tasks (name, description, done, due_date, list_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, 
    [task.name, task.description, false, task.due_date, task.list_id]);
    return newTask.rows;
  },

  async replace(taskId, task) {
    let newTask = await db.query(`
    UPDATE tasks 
    SET name = $2, description = $3, done = $4, due_date = $5, list_id = $6 
    WHERE id=$1 RETURNING *
    `, 
    [taskId, task.name, task.description, task.done, task.due_date, task.list_id]);
    return newTask.rows;
  },

  async update(taskId, newValues) {
    const task = (await db.query(`SELECT * FROM tasks WHERE id=$1`, [taskId])).rows[0];
    Object.assign(task, newValues);
    return this.replace(taskId, task)
  },

  async delete(taskId) {
    const task = await db.query(`DELETE FROM tasks WHERE id=$1 RETURNING *`, [taskId]);
    return task.rows;
  }
}