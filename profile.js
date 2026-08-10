"use strict";

const KAGE_PROFILE_STORAGE_KEY = "kage_profile";

const DEFAULT_PROFILE = {
  nickname: "",
  avatar: ""
};

function readKageProfile() {
  try {
    const raw = localStorage.getItem(
      KAGE_PROFILE_STORAGE_KEY
    );

    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }

    const parsed = JSON.parse(raw);

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
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function writeKageProfile(profile) {
  const cleanProfile = {
    nickname:
      typeof profile.nickname === "string"
        ? profile.nickname.trim().slice(0, 40)
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
      detail: {
        profile: cleanProfile
      }
    })
  );

  window.dispatchEvent(
    new CustomEvent("kage-identity-updated", {
      detail: {
        nickname: cleanProfile.nickname,
        profile: cleanProfile
      }
    })
  );

  return cleanProfile;
}

function getProfile() {
  return readKageProfile();
}

function getNickname() {
  return readKageProfile().nickname;
}

function setNickname(nickname) {
  const profile = readKageProfile();

  profile.nickname =
    typeof nickname === "string"
      ? nickname.trim().slice(0, 40)
      : "";

  return writeKageProfile(profile);
}

function getAvatar() {
  return readKageProfile().avatar;
}

function setAvatar(avatar) {
  const profile = readKageProfile();

  profile.avatar =
    typeof avatar === "string"
      ? avatar
      : "";

  return writeKageProfile(profile);
}

function removeAvatar() {
  return setAvatar("");
}

function clearProfile() {
  return writeKageProfile({
    ...DEFAULT_PROFILE
  });
}

window.KAGEProfile = {
  getProfile,
  getNickname,
  setNickname,
  getAvatar,
  setAvatar,
  removeAvatar,
  clearProfile
};
