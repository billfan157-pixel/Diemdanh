// Thư viện bên thứ ba — bundle từ npm thay vì CDN / file vendor.
// Gán lên window để code hiện tại (namespace GL) dùng như trước;
// sẽ chuyển sang import trực tiếp khi các module được tách hẳn.
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

window.XLSX = XLSX;
window.JSZip = JSZip;
window.supabase = { createClient: createClient };
