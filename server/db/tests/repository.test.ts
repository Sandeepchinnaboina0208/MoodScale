import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { repository } from '../repository';
import { db } from '../connection';

// Mock data for testing
const mockUser = {
  username: 'testuser123',
  email: 'test@example.com'
};

const mockMoodEntry = {
  userId: 1,
  moodScore: 8,
  emotions: ['happy', 'energetic'],
  notes: 'Great day!'
};

describe('DatabaseRepository', () => {
  beforeEach(async () => {
    // Setup test data
    console.log('Setting up test data...');
  });

  afterEach(async () => {
    // Cleanup test data
    console.log('Cleaning up test data...');
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const user = await repository.createUser(mockUser);
      
      expect(user).toBeDefined();
      expect(user.username).toBe(mockUser.username);
      expect(user.id).toBeGreaterThan(0);
    });

    it('should get user by ID', async () => {
      const createdUser = await repository.createUser(mockUser);
      const fetchedUser = await repository.getUserById(createdUser.id);
      
      expect(fetchedUser).toBeDefined();
      expect(fetchedUser?.username).toBe(mockUser.username);
    });

    it('should get user by username', async () => {
      await repository.createUser(mockUser);
      const fetchedUser = await repository.getUserByUsername(mockUser.username);
      
      expect(fetchedUser).toBeDefined();
      expect(fetchedUser?.username).toBe(mockUser.username);
    });

    it('should update user', async () => {
      const createdUser = await repository.createUser(mockUser);
      const updatedUser = await repository.updateUser(createdUser.id, {
        spotifyId: 'spotify123'
      });
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.spotifyId).toBe('spotify123');
    });
  });

  describe('Mood Entry Operations', () => {
    it('should create a mood entry', async () => {
      const entry = await repository.createMoodEntry(mockMoodEntry);
      
      expect(entry).toBeDefined();
      expect(entry.moodScore).toBe(mockMoodEntry.moodScore);
      expect(entry.emotions).toEqual(mockMoodEntry.emotions);
    });

    it('should get mood entries for user', async () => {
      await repository.createMoodEntry(mockMoodEntry);
      const entries = await repository.getMoodEntries(mockMoodEntry.userId);
      
      expect(entries).toBeDefined();
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should get mood trends', async () => {
      await repository.createMoodEntry(mockMoodEntry);
      const trends = await repository.getMoodTrends(mockMoodEntry.userId, 7);
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should reject invalid mood score', async () => {
      const invalidEntry = { ...mockMoodEntry, moodScore: 15 };
      
      await expect(repository.createMoodEntry(invalidEntry))
        .rejects.toThrow();
    });

    it('should reject invalid username', async () => {
      const invalidUser = { ...mockUser, username: 'ab' }; // Too short
      
      await expect(repository.createUser(invalidUser))
        .rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on mood entries', async () => {
      // Create multiple entries rapidly
      const promises = Array(15).fill(null).map(() => 
        repository.createMoodEntry(mockMoodEntry)
      );
      
      // Some should fail due to rate limiting
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(failures.length).toBeGreaterThan(0);
    });
  });
});