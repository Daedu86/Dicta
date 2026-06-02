export type OpenRouterSlotSelectorOption<SlotId extends string = string> = {
  id: SlotId;
  label: string;
  active: boolean;
  statusLabel: string;
};

export type OpenRouterSlotSelectorProps<SlotId extends string = string> = {
  slots: Array<OpenRouterSlotSelectorOption<SlotId>>;
  onSelectSlot: (slotId: SlotId) => void;
};

export function OpenRouterSlotSelector<SlotId extends string = string>({
  slots,
  onSelectSlot,
}: OpenRouterSlotSelectorProps<SlotId>) {
  return (
    <section className="openrouter-button-control openrouter-slot-control" aria-label="Generated session setup">
      <h4>Choose session setup</h4>
      <div className="openrouter-choice-row">
        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            className={`secondary-button openrouter-choice-button ${slot.active ? 'openrouter-choice-button-active' : ''}`}
            onClick={() => onSelectSlot(slot.id)}
            aria-pressed={slot.active}
            title={`${slot.label} has independent notes, model, output, validation, tokens, elapsed time, and create/cancel actions.`}
          >
            <span>{slot.label}</span>
            <small>{slot.statusLabel}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
