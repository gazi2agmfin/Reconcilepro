import React from "react";

type NumericInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  allowDecimal?: boolean;
};

const sanitizeValue = (value: string, allowDecimal: boolean) => {
  if (!value) return "";
  if (allowDecimal) {
    // remove anything that's not a digit or dot
    let v = value.replace(/[^0-9.]/g, "");
    // keep only first dot
    const first = v.indexOf(".");
    if (first >= 0) {
      v = v.slice(0, first + 1) + v.slice(first + 1).replace(/\./g, "");
    }
    return v;
  }
  return value.replace(/\D+/g, "");
};

const NumericInput: React.FC<NumericInputProps> = ({
  allowDecimal = false,
  onChange,
  onKeyDown,
  onWheel,
  onPaste,
  value,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // disallow exponential, plus/minus and dot when decimals aren't allowed
    if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
      e.preventDefault();
      return;
    }
    if (e.key === "." && !allowDecimal) {
      e.preventDefault();
      return;
    }
    if (onKeyDown) onKeyDown(e);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const sanitized = sanitizeValue(e.target.value, allowDecimal);
    if (onChange) {
      // reuse the event but replace target.value — cast to any to satisfy TS
      const event = Object.create(e);
      Object.defineProperty(event, "target", { value: { ...e.target, value: sanitized }, writable: false });
      onChange(event as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Prevent changing value via mouse wheel when input is focused
    // A simple approach: blur the control so wheel doesn't change it, and prevent default
    e.currentTarget.blur();
    e.preventDefault();
    if (onWheel) onWheel(e);
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    if (!onPaste) {
      const pasted = e.clipboardData.getData("text");
      const sanitized = sanitizeValue(pasted, allowDecimal);
      if (sanitized !== pasted) {
        e.preventDefault();
        const input = e.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const newValue = input.value.slice(0, start) + sanitized + input.value.slice(start);
        if (onChange) {
          const fakeEvent = Object.create(e) as any;
          fakeEvent.target = { ...input, value: sanitizeValue(newValue, allowDecimal) };
          onChange(fakeEvent as React.ChangeEvent<HTMLInputElement>);
        }
      }
    } else {
      onPaste(e);
    }
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      pattern={allowDecimal ? "[0-9]*(\\.[0-9]+)?" : "[0-9]*"}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onWheel={handleWheel}
      onPaste={handlePaste}
      value={value}
    />
  );
};

export default NumericInput;
