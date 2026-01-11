const postService = require("../services/postService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  validateStudentPost,
  validateTeacherPost,
} = require("../validators/postValidator");
const logger = require("../utils/logger");
const { getStudentById } = require("../services/studentService");
const {
  getStudentPremiumStatus,
  getTeacherPremiumStatus,
  getTeacherPostCount,
} = require("../services/premiumService");
const { getTeacherById } = require("../services/teacherService");

/**
 * Get all student posts
 */
exports.getAllStudentPosts = async (req, res) => {
  try {
    const user = req.user;
    const student = await getStudentById(user.id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }
    const posts = await postService.getAllStudentPosts(student.id);
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching student posts:", error);
    return errorResponse(res, "Failed to fetch student posts", 500);
  }
};

/**
 * Create a new student post
 */
exports.createStudentPost = async (req, res) => {
  try {
    const user = req.user;
    const student = await getStudentById(user.id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }
    // get stutent post count
    const postCount = await postService.getStudentPostCount(student.id);

    // get premium status
    const premiumStatus = await getStudentPremiumStatus(student.email);
    if (postCount >= 2 && !premiumStatus.hasPremium) {
      return errorResponse(res, "You can only create 2 posts", 400);
    }

    req.body.studentId = student.id;
    const validation = validateStudentPost(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const postId = await postService.createStudentPost(req.body);

    return successResponse(
      res,
      {
        message: "Post created successfully",
        postId,
      },
      201
    );
  } catch (error) {
    logger.error("Error creating student post:", error);
    return errorResponse(res, "Failed to create post", 500);
  }
};

/**
 * Update a student post
 */
exports.updateStudentPost = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateStudentPost(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    await postService.updateStudentPost(id, req.body);

    return successResponse(res, {
      message: "Post updated successfully",
    });
  } catch (error) {
    logger.error("Error updating student post:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to update post", 500);
  }
};

/**
 * Delete a student post
 */
exports.deleteStudentPost = async (req, res) => {
  try {
    const { id } = req.params;
    await postService.deleteStudentPost(id);

    return successResponse(res, {
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting student post:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to delete post", 500);
  }
};

/**
 * Get all teacher posts
 */
exports.getAllTeacherPosts = async (req, res) => {
  try {
    const user = req.user;
    const teacher = await getTeacherById(user.id);
    if (!teacher) {
      return errorResponse(res, "Teacher not found", 404);
    }
    const posts = await postService.getAllTeacherPosts(teacher.id);
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching teacher posts:", error);
    return errorResponse(res, "Failed to fetch teacher posts", 500);
  }
};

/**
 * Get teacher posts by teacher ID
 */
exports.getTeacherPostsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const posts = await postService.getTeacherPostsByTeacherId(teacherId);

    // Check if simple version requested
    if (req.path.includes("-simple")) {
      return successResponse(res, posts);
    }

    return successResponse(res, { posts });
  } catch (error) {
    logger.error("Error fetching teacher posts:", error);
    return errorResponse(res, "Failed to fetch teacher posts", 500);
  }
};

/**
 * Create a new teacher post
 */
exports.createTeacherPost = async (req, res) => {
  try {
    const user = req.user;
    const validation = validateTeacherPost(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }
    const teacher = await getTeacherById(user.id);
    if (teacher?.status !== "approved") {
      return errorResponse(
        res,
        "Your account is not approved yet. Please wait for approval.",
        400
      );
    }

    // get teacher post count
    const postCount = await getTeacherPostCount(user.id);
    const premiumStatus = await getTeacherPremiumStatus(teacher.email);
    if (postCount >= 2 && !premiumStatus.hasPremium) {
      return errorResponse(res, "You can only create 2 posts", 400);
    }

    const postId = await postService.createTeacherPost(req.body);

    return successResponse(
      res,
      {
        message: "Post created successfully",
        postId,
      },
      201
    );
  } catch (error) {
    logger.error("Error creating teacher post:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update a teacher post
 */
exports.updateTeacherPost = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateTeacherPost(req.body);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const user = req.user;
    // check if teacher post exists
    const post = await postService.getTeacherPostsByTeacherId(user.id, id);
    if (!post) {
      return errorResponse(res, "Post not found", 404);
    }

    await postService.updateTeacherPost(id, req.body);

    return successResponse(res, {
      message: "Post updated successfully",
    });
  } catch (error) {
    logger.error("Error updating teacher post:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to update post", 500);
  }
};

/**
 * Delete a teacher post
 */
exports.deleteTeacherPost = async (req, res) => {
  try {
    const { id } = req.params;
    await postService.deleteTeacherPost(id);

    return successResponse(res, {
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting teacher post:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to delete post", 500);
  }
};

/**
 * Get student post by ID
 */
exports.getStudentPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await postService.getStudentPostById(id);

    return successResponse(res, post);
  } catch (error) {
    logger.error("Error fetching student post:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch post", 500);
  }
};

/**
 * Get student posts by token
 */
exports.getStudentPostsByToken = async (req, res) => {
  try {
    const user = req.user;

    // check if has student
    const student = await getStudentById(user.id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }
    const posts = await postService.getStudentPostById(student.id);
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching student posts:", error);
    return errorResponse(res, "Failed to fetch student posts", 500);
  }
};

/**
 * Get all public teacher posts
 */
exports.getAllPublicTeacherPosts = async (req, res) => {
  try {
    const user = req.user;
    const posts = await postService.getAllPublicTeacherPosts(user?.id || null);
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching teacher posts:", error);
    return errorResponse(res, "Failed to fetch teacher posts", 500);
  }
};

/**
 * Get all student posts
 */
exports.getAllStudentPublicPosts = async (req, res) => {
  try {
    const user = req.user;

    const posts = await postService.getAllStudentPublicPosts(
      user?.email || null
    );
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching student posts:", error);
    return errorResponse(res, "Failed to fetch student posts", 500);
  }
};

/**
 * Get all public teacher posts by ID
 */
exports.getAllPublicTeacherPostsById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const posts = await postService.getAllPublicTeacherPostsById(
      id,
      user?.id || null
    );
    return successResponse(res, posts);
  } catch (error) {
    logger.error("Error fetching teacher posts:", error);
    return errorResponse(res, "Failed to fetch teacher posts", 500);
  }
};
