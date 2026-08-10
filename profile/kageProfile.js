/*
 * KAGE Profile System
 *
 * Handles persistent:
 * - nickname
 * - avatar
 *
 * Exposes:
 * window.KAGEProfile
 */
const KAGE_PROFILE_STORAGE_KEY = "kage_profile";
function getDefaultProfile() {
  return {
    nickname: "",
    avatar: ""
  };
}
function loadProfile() {
  try {
    const saved = localStorage.getItem(KAGE_PROFILE_STORAGE_KEY);
    if (!saved) {
      return getDefaultProfile();
    }
    const parsed = JSON.parse(saved);
    return {
      nickname:
        typeof parsed.nickname === "string"
          ? parsed.nickname
          : "",
      avatar:
        typeof parsed.avatar === "string"
          ? parsed.avatar
          : ""
    };
  } catch (error) {
    console.error("KAGE profile load failed:", error);
    return getDefaultProfile();
  }
}
function saveProfile(profile) {
  const cleanProfile = {
    nickname:
      typeof profile.nickname === "string"
        ? profile.nickname.trim()
        : "",
    avatar:
      typeof profile.avatar === "string"
        ? profile.avatar
        : ""
  };
  localStorage.setItem(
    KAGE_PROFILE_STORAGE_KEY,
    JSON.stringify(cleanProfile)
  );
  window.dispatchEvent(
    new CustomEvent("kage-profile-updated", {
      detail: cleanProfile
    })
  );
  return cleanProfile;
}
function getProfile() {
  return loadProfile();
}
function getNickname() {
  return loadProfile().nickname;
}
function getAvatar() {
  return loadProfile().avatar;
}
function setNickname(nickname) {
  const profile = loadProfile();
  profile.nickname =
    typeof nickname === "string"
      ? nickname.trim()
      : "";
  return saveProfile(profile);
}
function setAvatar(avatar) {
  const profile = loadProfile();
  profile.avatar =
    typeof avatar === "string"
      ? avatar
      : "";
  return saveProfile(profile);
}
function removeAvatar() {
  return setAvatar("");
}
window.KAGEProfile = {
  getProfile,
  getNickname,
  getAvatar,
  setNickname,
  setAvatar,
  removeAvatar
};
