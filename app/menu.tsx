import { ChangeEvent, useRef, useState } from 'react';

export default function Menu({ className, handleButtonClick, handleSelectChange }: {className?: string, handleButtonClick?: (action: string) => void, handleSelectChange?: (selectId: [string, string]) => void }) {
    const [showSecondInput, setShowSecondInput] = useState(false);
    const [select1, select2] = [useRef<HTMLSelectElement>(null), useRef<HTMLSelectElement>(null)];

    // Function to handle the change in select fields
    const handleSelect = (event: ChangeEvent<HTMLSelectElement>, selectId: string) => {
        if (selectId === 'structure2') {
            setShowSecondInput(event.target.value !== "---");
        }
        handleSelectChange?.call(null, [select1.current!.value, select2.current!.value]);
    };

    return (
        <div id="menu" className={className}>
            <div id="data-input" className="flex flex-row gap-x-2 m-2">
                <input
                    className="border border-1 border-black rounded px-2 w-12"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    onKeyDown={(event) => {
                        if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                            event.preventDefault();
                        }
                    }}
                />
                <input
                    disabled={!showSecondInput}
                    className="border border-1 border-black rounded px-2 w-12"
                    style={{ backgroundColor: showSecondInput ? 'white' : 'gray', opacity: showSecondInput ? 1 : 0.2 }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    onKeyDown={(event) => {
                        if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                            event.preventDefault();
                        }
                    }}
                />
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Add')}>Add</button>
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Delete')}>Delete</button>
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Search')}>Search</button>
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Clear')}>Clear</button>
            </div>
            <div id="structure-selection" className="flex flex-row gap-x-2 m-2">
                <select
                    ref={select1}
                    defaultValue="Linked List"
                    className="border border-1 border-black rounded px-2"
                    onChange={(event) => handleSelect(event, 'structure1')}
                >
                    <option>Linked List</option>
                    <option>Stack</option>
                    <option>Queue</option>
                    <option>Vector</option>
                </select>
                <select
                    ref={select2}
                    defaultValue="---"
                    className="border border-1 border-black rounded px-2"
                    onChange={(event) => handleSelect(event, 'structure2')}
                >
                    <option>Linked List</option>
                    <option>Stack</option>
                    <option>Queue</option>
                    <option>Vector</option>
                    <option>---</option>
                </select>
            </div>
        </div>
    );
};