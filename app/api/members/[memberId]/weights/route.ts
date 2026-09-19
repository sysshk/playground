/*
  API — 체중·인바디 기록 추가 (체중만 필수, 인바디 칸은 선택)

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  readBody,
  requireOwnedMember,
  requireTrainerId,
  serverError,
} from "@/lib/api";
import {
  isValidDate,
  isValidWeight,
  toNumber,
  toTrimmed,
  WEIGHT_RANGE_MESSAGE,
} from "@/lib/validation";

type Params = { params: Promise<{ memberId: string }> };

const BALANCES = ["balanced", "slight", "severe"];

/** 인바디 칸. 비운 칸은 null로 두고, 적었으면 범위를 봄 */
function parseInbody(body: Record<string, unknown>) {
  const errors: string[] = [];
  const num = (key: string, label: string, min: number, max: number, integer = false) => {
    const value = toNumber(body[key]);
    if (value === undefined) return null;
    if (value < min || value > max || (integer && !Number.isInteger(value))) {
      errors.push(`${label}은(는) ${min}~${max} 사이로 입력해 주세요.`);
    }
    return value;
  };
  const balance = (key: string) =>
    typeof body[key] === "string" && BALANCES.includes(body[key]) ? (body[key] as string) : null;

  const data = {
    measuredHour: num("measuredHour", "측정 시각", 0, 23, true),
    gender: body.gender === "male" || body.gender === "female" ? body.gender : null,
    age: num("age", "나이", 1, 120, true),
    height: num("height", "키", 50, 250),
    skeletalMuscle: num("skeletalMuscle", "골격근량", 0, 200),
    bodyFatMass: num("bodyFatMass", "체지방량", 0, 300),
    bodyFatPercent: num("bodyFatPercent", "체지방률", 0, 80),
    waistHipRatio: num("waistHipRatio", "복부지방률", 0.3, 2),
    visceralFatLevel: num("visceralFatLevel", "내장지방 레벨", 1, 30, true),
    visceralFatArea: num("visceralFatArea", "내장지방 면적", 0, 500),
    balanceUpper: balance("balanceUpper"),
    balanceLower: balance("balanceLower"),
    balanceUpperLower: balance("balanceUpperLower"),
    leanRightArm: num("leanRightArm", "오른팔 근육량", 0, 100),
    leanRightArmPct: num("leanRightArmPct", "오른팔 표준 대비", 0, 300),
    leanLeftArm: num("leanLeftArm", "왼팔 근육량", 0, 100),
    leanLeftArmPct: num("leanLeftArmPct", "왼팔 표준 대비", 0, 300),
    leanTrunk: num("leanTrunk", "몸통 근육량", 0, 100),
    leanTrunkPct: num("leanTrunkPct", "몸통 표준 대비", 0, 300),
    leanRightLeg: num("leanRightLeg", "오른다리 근육량", 0, 100),
    leanRightLegPct: num("leanRightLegPct", "오른다리 표준 대비", 0, 300),
    leanLeftLeg: num("leanLeftLeg", "왼다리 근육량", 0, 100),
    leanLeftLegPct: num("leanLeftLegPct", "왼다리 표준 대비", 0, 300),
  };

  const [first] = errors;
  return first ? { error: first, data: null } : { error: null, data };
}

/** 체중 기록 추가 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const owned = await requireOwnedMember(memberId, scope);
    if (owned.error) return owned.error;

    const body = await readBody(request);

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const weight = toNumber(body.weight);
    if (weight === undefined || !isValidWeight(weight)) {
      return badRequest(WEIGHT_RANGE_MESSAGE);
    }

    const inbody = parseInbody(body);
    if (inbody.error !== null) return badRequest(inbody.error);

    const record = await prisma.weightRecord.create({
      data: { memberId, date: body.date, weight, memo: toTrimmed(body.memo), ...inbody.data },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    return serverError("weights.POST", e);
  }
}
