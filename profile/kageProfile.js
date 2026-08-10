const PROFILE_STORAGE_KEY = "kage.profile";
const DEFAULT_PROFILE = {
  nickname: "",
  avatar: ""
};
function getStoredProfile() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROFILE };
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
    return {
      nickname:
        typeof parsed.nickname === "string"
          ? parsed.nickname.trim()
          : "",
      avatar:
        typeof parsed.avatar === "string"
          ? parsed.avatar
          : ""
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}
function saveProfile(profile) {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROFILE };
  }
  const nextProfile = {
    nickname:
      typeof profile?.nickname === "string"
        ? profile.nickname.trim().slice(0, 40)
        : "",
    avatar:
      typeof profile?.avatar === "string"
        ? profile.avatar
        : ""
  };
  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(nextProfile)
  );
  window.dispatchEvent(
    new CustomEvent("kage-profile-updated", {
      detail: nextProfile
    })
  );
  return nextProfile;
}
function getProfile() {
  return getStoredProfile();
}
function setNickname(nickname) {
  const profile = getStoredProfile();
  return saveProfile({
    ...profile,
    nickname
  });
}
function setAvatar(avatar) {
  const profile = getStoredProfile();
  return saveProfile({
    ...profile,
    avatar
  });
}
function removeAvatar() {
  const profile = getStoredProfile();
  return saveProfile({
    ...profile,
    avatar: ""
  });
}
function clearProfile() {
  return saveProfile({
    ...DEFAULT_PROFILE
  });
}
function getDisplayName(fallback = "there") {
  const nickname = getStoredProfile().nickname;
  return nickname || fallback;
}
function createProfileAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("Invalid profile image file."));
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("Profile picture must be an image."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read profile image."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error("Unable to read profile image."));
    };
    reader.readAsDataURL(file);
  });
}
async function setAvatarFromFile(file) {
  const avatar = await createProfileAvatarDataUrl(file);
  return setAvatar(avatar);
}
function subscribeToProfileUpdates(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event) => {
    callback(event.detail || getStoredProfile());
  };
  window.addEventListener("kage-profile-updated", handler);
  return () => {
    window.removeEventListener("kage-profile-updated", handler);
  };
}
export {
  PROFILE_STORAGE_KEY,
  DEFAULT_PROFILE,
  getProfile,
  saveProfile,
  setNickname,
  setAvatar,
  setAvatarFromFile,
  removeAvatar,
  clearProfile,
  getDisplayName,
  subscribeToProfileUpdates
};
