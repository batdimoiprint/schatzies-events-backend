import {
  getAllUsers,
  findUserByUserId,
  createUser,
  updateUser,
  deleteUser,
} from '../services/users.service.js';
import { updateInquiry } from '../services/inquiry.service.js';
import { sendAccountCreatedEmail } from '../services/mailer.service.js';

export async function getUsers(req, res) {
  try {
    const users = await getAllUsers();
    return res.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch users';
    return res.status(500).json({ error: message });
  }
}

export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const user = await findUserByUserId(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch user';
    return res.status(500).json({ error: message });
  }
}

export async function createUserHandler(req, res) {
  try {
    const temporaryPassword = req.body?.password;
    
    if (!temporaryPassword) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await createUser(req.body ?? {});

    // Send account creation email with temporary password
    try {
      const emailResult = await sendAccountCreatedEmail(
        { ...user, email: req.body.email },
        temporaryPassword
      );
      
      if (emailResult.skipped) {
        console.warn('Account created email was skipped:', emailResult.reason);
      }
    } catch (emailError) {
      console.error('Failed to send account creation email:', emailError);
      // Don't fail the user creation if email fails
    }

    if (req.body.inquiryId) {
      try {
        await updateInquiry(req.body.inquiryId, {
          is_Account_Created: true,
          userId: user.user_id,
        });
      } catch (err) {
        console.error('Failed to update inquiry is_Account_Created:', err);
      }
    }

    return res.status(201).json({
      message: `${user.email} created successfully`,
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create user';
    const status = message.includes('already registered') ? 409 : 400;

    return res.status(status).json({ error: message });
  }
}

export async function updateUserHandler(req, res) {
  try {
    const { userId } = req.params;
    const user = await updateUser(userId, req.body ?? {});

    return res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update user';
    const status = message.includes('not found') ? 404 : 400;

    return res.status(status).json({ error: message });
  }
}

export async function deleteUserHandler(req, res) {
  try {
    const { userId } = req.params;
    await deleteUser(userId);

    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete user';
    const status = message.includes('not found') ? 404 : 500;

    return res.status(status).json({ error: message });
  }
}
