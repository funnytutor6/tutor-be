const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { validate } = require("../middleware/validationMiddleware");
const {
  validateStudentPost,
  validateTeacherPost,
} = require("../validators/postValidator");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authMiddleware");

// Student posts routes
router.get("/student", authenticate, postController.getAllStudentPosts);
router.post(
  "/student",
  authenticate,
  validate(validateStudentPost),
  postController.createStudentPost
);
router.put(
  "/student/:id",
  validate(validateStudentPost),
  postController.updateStudentPost
);
router.delete("/student/:id", authenticate, postController.deleteStudentPost);
router.get("/student", authenticate, postController.getStudentPostsByToken);

// Teacher posts routes
router.get("/teachers/posts", authenticate, postController.getAllTeacherPosts);
router.get(
  "/teachers/:teacherId/posts",
  postController.getTeacherPostsByTeacherId
);
router.get(
  "/teachers/:teacherId/posts-simple",
  postController.getTeacherPostsByTeacherId
);
router.post(
  "/teachers/posts",
  authenticate,
  validate(validateTeacherPost),
  postController.createTeacherPost
);
router.put(
  "/teachers/posts/:id",
  authenticate,
  validate(validateTeacherPost),
  postController.updateTeacherPost
);
router.delete(
  "/teachers/posts/:id",
  authenticate,
  postController.deleteTeacherPost
);

// public posts routes

router.get(
  "/teachers/public",
  optionalAuthenticate,
  postController.getAllPublicTeacherPosts
);
router.get(
  "/teachers/public/:id",
  optionalAuthenticate,
  postController.getAllPublicTeacherPostsById
);

// public posts routes
router.get(
  "/public",
  optionalAuthenticate,
  postController.getAllStudentPublicPosts
);

module.exports = router;
