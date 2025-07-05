import { repository } from "./db/repository";
import type { IStorage } from "./db/repository";

// Export the enhanced repository as the storage interface
export const storage: IStorage = repository;

// Keep backward compatibility with existing code
export { MemStorage } from "./storage-legacy";