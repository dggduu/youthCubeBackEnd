import express from 'express';
const router = express.Router();
import { userController } from "../controllers/userController.js";
import authenticateToken from "../middleware/authMiddleware.js";

router.get('/api/users', userController.getAllUsers);
router.get('/api/users/nopaging', userController.getAllUsersNoPaging);
router.get('/api/users/:id', userController.getUserById);
router.put('/api/users/:id', authenticateToken, userController.updateUser);
router.delete('/api/users/:id', authenticateToken, userController.deleteUser);
router.post('/api/users/:id/follow', authenticateToken, userController.followUser);
router.delete('/api/users/:id/unfollow', authenticateToken, userController.unfollowUser);
router.get('/api/users/:id/followers', userController.getUserFollowers);
router.get('/api/users/:id/following', userController.getUserFollowing);
// router.get('/api/users/:userId/collections', authenticateToken, postController.getUserCollections);

export default router;