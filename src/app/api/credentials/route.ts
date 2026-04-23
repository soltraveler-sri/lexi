import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readBoolean,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import * as credentialsRepo from "@/lib/db/repos/credentials";

function isCredentialProvider(value: string) {
  return value === "anthropic" || value === "openai";
}

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const credentials = await credentialsRepo.listForUser(user.id);
  return NextResponse.json({
    credentials: credentials.map((credential) => ({
      ...credential,
      apiKey: "••••••••",
    })),
  });
}

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const provider = readString(body, "provider");
  const apiKey = readString(body, "apiKey");
  const label = readString(body, "label", "Personal key");

  if (!isCredentialProvider(provider) || !apiKey) {
    return badRequest("provider_and_api_key_required");
  }

  const credential = await credentialsRepo.create({
    userId: user.id,
    provider,
    ownership: "user",
    apiKey,
    label,
    isDefault: readBoolean(body, "isDefault", false),
  });

  return NextResponse.json(
    { credential: { ...credential, apiKey: "••••••••" } },
    { status: 201 },
  );
}
