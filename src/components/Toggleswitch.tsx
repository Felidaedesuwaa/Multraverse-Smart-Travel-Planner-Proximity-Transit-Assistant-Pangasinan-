import { colors } from "../theme/colors";

export default function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: checked ? colors.sunsetCoral : "#CBD5E0",
        cursor: "pointer",
        position: "relative",
        padding: 0,
        flexShrink: 0,
        transition: "background-color 0.2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}