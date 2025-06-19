import { google, sheets_v4 } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials-google.json",
  scopes: SCOPES,
});

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const authClient: any = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth: authClient,
  });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth });
}
