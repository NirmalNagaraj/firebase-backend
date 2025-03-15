const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const supabaseUrl = 'https://zliaheybskltrdzbecad.supabase.co';
const supabaseKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaWFoZXlic2tsdHJkemJlY2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMzE1NzksImV4cCI6MjA1NzYwNzU3OX0.1EZLzIU-mLmbcGBeE9sX1BA0Pc_3Crv7qcRbhmWu4k8';
const supabase = createClient(supabaseUrl, supabaseKey);
module.exports = function logMiddleware(projectId) {
  if (!projectId) throw new Error("Project ID is required");

  return async function (req, res, next) {
    const startTime = Date.now();

    // Capture original res.end
    const originalEnd = res.end;

    res.end = async function (...args) {
      const duration = Date.now() - startTime;
      const logEntry = {
        project_id: projectId,
        route: req.url,
        method: req.method,
        status: res.statusCode,
        created_at: new Date().toISOString(),
      };

      try {
        // Insert log entry into Supabase
        const { error } = await supabase.from("logs").insert([logEntry]);

        if (error) {
          console.error("Error inserting log into Supabase:", error.message);
        }
      } catch (err) {
        console.error("Database Error:", err.message);
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};