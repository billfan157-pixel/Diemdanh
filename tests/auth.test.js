import { describe, it, expect, beforeEach } from "vitest";
import { loadGL, resetStorage } from "./helpers/load-gl.js";

const FILES = ["src/config/constants.js", "src/core/utils.js", "src/core/auth.js"];

describe("core/auth — PIN PBKDF2", () => {
  let GL;
  beforeEach(() => {
    resetStorage();
    GL = loadGL(FILES);
  });

  it("tạo store mặc định với admin/1234 và không có pinPlain", () => {
    const admin = GL.authStore.users[0];
    expect(admin.username).toBe("admin");
    expect(admin.pinPlain).toBeUndefined();
  });

  it("đăng nhập admin/1234 thành công và nâng cấp hash lên PBKDF2", async () => {
    const res = await GL.login("admin", "1234", false);
    expect(res.ok).toBe(true);
    expect(GL.isPbkdf2Hash(res.user.pinHash)).toBe(true);
    expect(res.user.pinPlain).toBeUndefined();
  });

  it("đăng nhập sai PIN bị từ chối", async () => {
    const res = await GL.login("admin", "9999", false);
    expect(res.ok).toBe(false);
  });

  it("PIN mặc định bị đánh dấu là yếu (bắt đổi PIN)", async () => {
    const res = await GL.login("admin", "1234", false);
    expect(GL.userHasWeakPin(res.user)).toBe(true);
  });

  it("scrubPinPlain xóa pinPlain nhưng vẫn đăng nhập được bằng hash cũ", async () => {
    const store = {
      users: [
        {
          id: "u1",
          username: "glv01",
          role: "glv",
          pinPlain: "5678",
          active: true,
        },
      ],
    };
    GL.scrubPinPlain(store);
    expect(store.users[0].pinPlain).toBeUndefined();
    expect(store.users[0].pinHash).toBeTruthy();
    GL.authStore = store;
    const res = await GL.login("glv01", "5678", false);
    expect(res.ok).toBe(true);
    expect(GL.isPbkdf2Hash(store.users[0].pinHash)).toBe(true);
  });

  it("changeOwnPin đổi PIN, chặn PIN yếu và PIN cũ sai", async () => {
    await GL.login("admin", "1234", false);
    let r = await GL.changeOwnPin("1234", "1111", "1111");
    expect(r.ok).toBe(false); // PIN yếu
    r = await GL.changeOwnPin("sai", "875421", "875421");
    expect(r.ok).toBe(false); // PIN cũ sai
    r = await GL.changeOwnPin("1234", "875421", "875421");
    expect(r.ok).toBe(true);
    const again = await GL.login("admin", "875421", false);
    expect(again.ok).toBe(true);
    expect(GL.userHasWeakPin(again.user)).toBe(false);
  });

  it("createUser (Ban GL) tạo user với hash PBKDF2, không pinPlain", async () => {
    await GL.login("admin", "1234", false);
    const res = await GL.createUser({
      username: "glv02",
      displayName: "GLV 02",
      pin: "246810",
      role: "glv",
      classIds: [],
    });
    expect(res.ok).toBe(true);
    expect(GL.isPbkdf2Hash(res.user.pinHash)).toBe(true);
    expect(res.user.pinPlain).toBeUndefined();
    const login = await GL.login("glv02", "246810", false);
    expect(login.ok).toBe(true);
  });

  it("getUserPinPlain luôn trả null (không lộ PIN)", async () => {
    await GL.login("admin", "1234", false);
    expect(GL.getUserPinPlain("bat-ky")).toBeNull();
  });
});
