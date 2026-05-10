"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  audienceSwapTransform,
  rewriteTransform,
  tightenLoosenTransform,
  toneShiftTransform,
} from "@/lib/transforms/inline";
import type { Transform, TransformParameter } from "@/lib/transforms/types";
import { cn } from "@/lib/utils";

import "@/lib/transforms/inline";

const SHELF_TRANSFORMS: Transform[] = [
  rewriteTransform,
  tightenLoosenTransform,
  toneShiftTransform,
  audienceSwapTransform,
];

function paramFor(parameter: TransformParameter, value: string | undefined) {
  return parameter.options.find((option) => option.value === value);
}

function defaultParameters(transform: Transform): Record<string, string> {
  const out: Record<string, string> = {};
  for (const param of transform.parameters ?? []) {
    out[param.id] = param.default ?? param.options[0].value;
  }
  return out;
}

function ToneAxisAndDirection({
  parameters,
  setParameters,
}: {
  parameters: Record<string, string>;
  setParameters: (next: Record<string, string>) => void;
}) {
  const axisOptions = toneShiftTransform.parameters?.[0].options ?? [];
  const axisValue = parameters.axis ?? "formal_casual";
  const directionsByAxis: Record<string, string[]> = {
    formal_casual: ["formal", "casual"],
    hedged_direct: ["hedged", "direct"],
    cold_warm: ["cold", "warm"],
  };
  const directionLabels: Record<string, string> = {
    formal: "More formal",
    casual: "More casual",
    hedged: "More hedged",
    direct: "More direct",
    cold: "Cooler",
    warm: "Warmer",
  };
  const directionValues = directionsByAxis[axisValue] ?? ["casual"];
  const directionValue = directionValues.includes(parameters.direction ?? "")
    ? parameters.direction
    : directionValues[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {axisOptions.map((option) => (
          <button
            className={cn(
              "rounded-sm border px-2 py-1 text-xs",
              axisValue === option.value
                ? "border-accent bg-accent-soft text-text"
                : "border-border bg-surface hover:bg-surface-sunken",
            )}
            key={option.value}
            onClick={() => {
              const nextDirections = directionsByAxis[option.value] ?? [];
              setParameters({
                axis: option.value,
                direction: nextDirections[0] ?? "",
              });
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {directionValues.map((value) => (
          <button
            className={cn(
              "rounded-sm border px-2 py-1 text-xs",
              directionValue === value
                ? "border-accent bg-accent-soft text-text"
                : "border-border bg-surface hover:bg-surface-sunken",
            )}
            key={value}
            onClick={() => setParameters({ ...parameters, direction: value })}
            type="button"
          >
            {directionLabels[value] ?? value}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenericParameterPicker({
  transform,
  parameters,
  setParameters,
}: {
  transform: Transform;
  parameters: Record<string, string>;
  setParameters: (next: Record<string, string>) => void;
}) {
  if (transform.id === "tone_shift") {
    return (
      <ToneAxisAndDirection
        parameters={parameters}
        setParameters={setParameters}
      />
    );
  }

  if (!transform.parameters?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {transform.parameters.map((parameter) => (
        <div key={parameter.id}>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-text-faint">
            {parameter.label}
          </div>
          <div className="flex flex-wrap gap-1">
            {parameter.options.map((option) => {
              const selected =
                parameters[parameter.id] === option.value ||
                (!parameters[parameter.id] && option.value === parameter.default);
              return (
                <button
                  className={cn(
                    "rounded-sm border px-2 py-1 text-xs",
                    selected
                      ? "border-accent bg-accent-soft text-text"
                      : "border-border bg-surface hover:bg-surface-sunken",
                  )}
                  key={option.value}
                  onClick={() =>
                    setParameters({
                      ...parameters,
                      [parameter.id]: option.value,
                    })
                  }
                  title={option.description}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransformShelf({
  onRun,
  onClose,
}: {
  onRun: (transform: Transform, parameters: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [activeTransformId, setActiveTransformId] = useState<string | null>(null);
  const [draftParameters, setDraftParameters] = useState<Record<string, string>>({});

  const activeTransform =
    SHELF_TRANSFORMS.find((transform) => transform.id === activeTransformId) ?? null;

  function pick(transform: Transform) {
    if (!transform.parameters?.length) {
      onRun(transform, {});
      onClose();
      return;
    }
    setActiveTransformId(transform.id);
    setDraftParameters(defaultParameters(transform));
  }

  function commit() {
    if (!activeTransform) {
      return;
    }
    onRun(activeTransform, draftParameters);
    onClose();
  }

  return (
    <div className="rewrite-strip-active flex flex-col gap-2 rounded-md border border-border bg-surface p-2 font-ui shadow-md">
      {!activeTransform ? (
        <ul className="flex flex-col">
          {SHELF_TRANSFORMS.map((transform) => (
            <li key={transform.id}>
              <button
                className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-surface-sunken"
                onClick={() => pick(transform)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent-hover" />
                  <span className="font-medium">{transform.name}</span>
                </span>
                {transform.parameters?.length ? (
                  <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
                ) : transform.hotkey ? (
                  <span className="text-xs text-text-faint">{transform.hotkey}</span>
                ) : null}
              </button>
              <p className="px-2 pb-2 text-xs text-text-faint">{transform.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3 px-2 py-2">
          <header className="flex items-center justify-between">
            <button
              className="text-xs text-text-faint hover:underline"
              onClick={() => setActiveTransformId(null)}
              type="button"
            >
              ← Back
            </button>
            <span className="text-sm font-medium">{activeTransform.name}</span>
          </header>
          <GenericParameterPicker
            parameters={draftParameters}
            setParameters={setDraftParameters}
            transform={activeTransform}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-faint">
              {Object.entries(draftParameters)
                .map(([key, value]) => {
                  const param = activeTransform.parameters?.find((p) => p.id === key);
                  if (!param) return null;
                  const option = paramFor(param, value);
                  return option ? `${param.label}: ${option.label}` : null;
                })
                .filter(Boolean)
                .join(" · ")}
            </span>
            <Button onClick={commit} size="sm">
              Run
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
