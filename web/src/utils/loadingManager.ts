/**
 * Global Loading Manager
 * 
 * Manages loading state for API requests.
 * Shows a global loading indicator when requests are pending.
 */

type LoadingListener = (isLoading: boolean, pendingRequests: number) => void;

class LoadingManager {
  private pendingRequests = 0;
  private listeners: Set<LoadingListener> = new Set();

  /**
   * Increment pending requests counter
   */
  startLoading() {
    this.pendingRequests++;
    this.notify();
  }

  /**
   * Decrement pending requests counter
   */
  stopLoading() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    this.notify();
  }

  /**
   * Check if any requests are pending
   */
  isLoading(): boolean {
    return this.pendingRequests > 0;
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests;
  }

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify() {
    const isLoading = this.isLoading();
    this.listeners.forEach(listener => {
      listener(isLoading, this.pendingRequests);
    });
  }

  /**
   * Reset loading state (useful for cleanup)
   */
  reset() {
    this.pendingRequests = 0;
    this.notify();
  }
}

export const loadingManager = new LoadingManager();
