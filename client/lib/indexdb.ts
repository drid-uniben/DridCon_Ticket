const DB_NAME = "hms-portal";
const DB_VERSION = 2;
const TOKEN_STORE = "auth-tokens";
const USER_DATA_STORE = "user-data";

interface TokenData {
  id: string;
  value: string;
  timestamp: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    console.log("Initializing IndexedDB");

    if (typeof window === "undefined" || !window.indexedDB) {
      console.error(
        "Your browser doesn't support IndexedDB or running on server"
      );
      reject("IndexedDB not supported");
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error(
        "IndexedDB error:",
        (event.target as IDBOpenDBRequest)?.error
      );
      reject(
        `IndexedDB error: ${(event.target as IDBOpenDBRequest)?.error?.message}`
      );
    };

    request.onsuccess = (event) => {
      console.log("IndexedDB initialized successfully");
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      console.log("Creating/upgrading IndexedDB schema");
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        db.createObjectStore(TOKEN_STORE, { keyPath: "id" });
        console.log("Token store created");
      }

      if (!db.objectStoreNames.contains(USER_DATA_STORE)) {
        db.createObjectStore(USER_DATA_STORE, { keyPath: "id" });
        console.log("User data store created");
      }
    };
  });
};

export const saveTokens = async (
  accessToken: string,
  refreshToken?: string
): Promise<boolean> => {
  if (!accessToken) {
    console.error("Attempted to save null/undefined access token");
    return false;
  }

  try {
    console.log("Saving tokens to IndexedDB");
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], "readwrite");

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(false);
      };

      const store = transaction.objectStore(TOKEN_STORE);
      const timestamp = Date.now();

      const accessTokenObject: TokenData = {
        id: "accessToken",
        value: accessToken,
        timestamp,
      };

      const accessRequest = store.put(accessTokenObject);

      accessRequest.onerror = (event) => {
        console.error(
          "Error saving access token:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };

      if (refreshToken) {
        const refreshTokenObject: TokenData = {
          id: "refreshToken",
          value: refreshToken,
          timestamp,
        };

        const refreshRequest = store.put(refreshTokenObject);

        refreshRequest.onerror = (event) => {
          console.error(
            "Error saving refresh token:",
            (event.target as IDBRequest)?.error
          );
          reject(false);
        };

        refreshRequest.onsuccess = () => {
          console.log("Both tokens saved successfully");
          resolve(true);
        };
      } else {
        accessRequest.onsuccess = () => {
          console.log("Access token saved successfully");
          resolve(true);
        };
      }
    });
  } catch (error) {
    console.error("Failed to save tokens:", error);
    return false;
  }
};

export const getToken = async (
  tokenType: "accessToken" | "refreshToken" = "accessToken"
): Promise<string | null> => {
  try {
    console.log(`Getting ${tokenType} from IndexedDB`);
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], "readonly");

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(null);
      };

      const store = transaction.objectStore(TOKEN_STORE);
      const request = store.get(tokenType);

      request.onsuccess = () => {
        const result = request.result as TokenData;
        const token = result ? result.value : null;
        console.log(
          `${tokenType} retrieval:`,
          token ? "Token found" : "No token found"
        );

        if (token && result.timestamp) {
          const tokenAge = Date.now() - result.timestamp;
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

          if (tokenAge > maxAge) {
            console.warn(`${tokenType} is too old, removing it`);
            removeTokens().catch((err) =>
              console.error("Error removing old token:", err)
            );
            resolve(null);
            return;
          }
        }

        resolve(token);
      };

      request.onerror = (event) => {
        console.error(
          `Error getting ${tokenType}:`,
          (event.target as IDBRequest)?.error
        );
        reject(null);
      };
    });
  } catch (error) {
    console.error(`Failed to get ${tokenType}:`, error);
    return null;
  }
};

export const removeTokens = async (): Promise<boolean> => {
  try {
    console.log("Removing all tokens");
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], "readwrite");

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(false);
      };

      const store = transaction.objectStore(TOKEN_STORE);

      const accessRequest = store.delete("accessToken");
      const refreshRequest = store.delete("refreshToken");

      let completedRequests = 0;
      const totalRequests = 2;

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          console.log("All tokens removed successfully");
          resolve(true);
        }
      };

      accessRequest.onsuccess = checkCompletion;
      refreshRequest.onsuccess = checkCompletion;

      accessRequest.onerror = (event) => {
        console.error(
          "Error removing access token:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };

      refreshRequest.onerror = (event) => {
        console.error(
          "Error removing refresh token:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };
    });
  } catch (error) {
    console.error("Failed to remove tokens:", error);
    return false;
  }
};

export const saveUserData = async (userData: object): Promise<boolean> => {
  if (!userData) {
    console.error("Attempted to save null/undefined user data");
    return false;
  }

  try {
    console.log("Saving user data to IndexedDB");
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_DATA_STORE], "readwrite");

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(false);
      };

      const store = transaction.objectStore(USER_DATA_STORE);
      const userObject = { id: "userData", value: userData };

      const request = store.put(userObject);

      request.onerror = (event) => {
        console.error(
          "Error saving user data:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };

      request.onsuccess = () => {
        console.log("User data saved successfully");
        resolve(true);
      };
    });
  } catch (error) {
    console.error("Failed to save user data:", error);
    return false;
  }
};

export const getUserData = async (): Promise<object | null> => {
  try {
    console.log("Getting user data from IndexedDB");
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([USER_DATA_STORE], "readonly");

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(null);
      };

      const store = transaction.objectStore(USER_DATA_STORE);
      const request = store.get("userData");

      request.onsuccess = () => {
        const result = request.result;
        const userData = result ? result.value : null;
        console.log(
          "User data retrieval:",
          userData ? "Data found" : "No data found"
        );
        resolve(userData);
      };

      request.onerror = (event) => {
        console.error(
          "Error getting user data:",
          (event.target as IDBRequest)?.error
        );
        reject(null);
      };
    });
  } catch (error) {
    console.error("Failed to get user data:", error);
    return null;
  }
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    console.log("Clearing all data from IndexedDB");
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [TOKEN_STORE, USER_DATA_STORE],
        "readwrite"
      );

      transaction.onerror = (event) => {
        console.error(
          "Transaction error:",
          (event.target as IDBTransaction)?.error
        );
        reject(false);
      };

      const tokenStore = transaction.objectStore(TOKEN_STORE);
      const userStore = transaction.objectStore(USER_DATA_STORE);

      const tokenRequest = tokenStore.clear();
      const userRequest = userStore.clear();

      let completed = 0;

      const onComplete = () => {
        completed++;
        if (completed === 2) {
          console.log("All data cleared successfully");
          resolve(true);
        }
      };

      tokenRequest.onsuccess = onComplete;
      userRequest.onsuccess = onComplete;

      tokenRequest.onerror = (event) => {
        console.error(
          "Error clearing token store:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };

      userRequest.onerror = (event) => {
        console.error(
          "Error clearing user data store:",
          (event.target as IDBRequest)?.error
        );
        reject(false);
      };
    });
  } catch (error) {
    console.error("Failed to clear all data:", error);
    return false;
  }
};