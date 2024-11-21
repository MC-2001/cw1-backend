const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors({
  origin: "https://mc-2001.github.io",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type"
}));

app.use(express.json());
app.set("json spaces", 3);

// Load properties from the file
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
const properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// Construct MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${encodeURIComponent(dbPassword)}${dbHost}${dbParams}`;

// Create a MongoClient with options to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Declare variable to hold the database reference

// Serve static files from the current directory // Middleware
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect(); // Await the connection
    console.log("Connected to MongoDB");
    db1 = client.db(dbName); // Dynamically use dbName from properties
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process if unable to connect
  }
}

connectDB(); // Call the connectDB function

// Middleware to set collection based on the route
app.param("collectionName", async function (req, res, next, collectionName) {
  try {
    req.collection = db1.collection(collectionName);
    console.log("Middleware set collection:", req.collection.collectionName);
    next();
  } catch (err) {
    console.error("Error in collection middleware:", err);
    res.status(500).json({ error: "Invalid collection name" });
  }
});

// Reference the Lessons collection
function lessonsCollection() {
  return db1.collection("Lessons");
}

// GET all lessons
app.get("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;
    const lesson = await lessonsCollection().findOne({ _id: new ObjectId(lessonId) });

    if (lesson) {
      res.json(lesson);
    } else {
      res.status(404).json({ error: "Lesson not found" });
    }
  } catch (err) {
    console.error("Error fetching lesson by ID:", err);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// POST a new lesson
app.post("/Kitten/Lessons", async (req, res) => {
  try {
    const lesson = req.body;
    const result = await lessonsCollection().insertOne(lesson);

    res.status(201).json({
      ...lesson,
      _id: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding lesson:", err);
    res.status(500).json({ error: "Failed to add lesson" });
  }
});

// PUT (Update) a lesson by ID
app.put("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const updatedLesson = req.body;
    const result = await lessonsCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedLesson }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ message: "Lesson updated successfully" });
  } catch (err) {
    console.error("Error updating lesson:", err);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// DELETE a lesson by ID
app.delete("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const result = await lessonsCollection().deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    console.error("Error deleting lesson:", err);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An internal server error occurred" });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
