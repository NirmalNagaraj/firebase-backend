// middlewares/extractCriteria.js
const extractCriteria = (pool) => async (req, res, next) => {
  const registerNumber = req.registerNumber;

  try {
    const [rows] = await pool.query('SELECT CGPA FROM details WHERE  `Register Number` = ?', [registerNumber]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentCGPA = rows[0].cgpa;

    req.studentCGPA = studentCGPA;

    next();
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = extractCriteria;
