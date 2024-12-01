import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { StructureType, Structure } from './datastructures';
import { useTranslations } from 'next-intl';

export default function Menu({
    className,
    inputValue1,
    inputValue2,
    setInputValue1,
    setInputValue2,
    dataStructureSelection,
    actions,
    handleButtonClick,
    handleSelectChange,
    handleInputChange
}: {
    className?: string, 
    inputValue1: number,
    inputValue2: number,
    setInputValue1: (value: number) => void,
    setInputValue2: (value: number) => void,
    dataStructureSelection: string[],
    actions: ReturnType<Structure["getActions"]>, 
    handleButtonClick?: (action: string) => void,
    handleSelectChange?: Dispatch<SetStateAction<[StructureType, StructureType]>>,
    handleInputChange?: (input: [number, number]) => void
}) {
    const t = useTranslations();

    const [showSecondInput, setShowSecondInput] = useState(false);
    const [select1, select2] = [useRef<HTMLSelectElement>(null), useRef<HTMLSelectElement>(null)];

    // Function to handle the change in select fields
    const handleSelect = (event: ChangeEvent<HTMLSelectElement>, selectId: string) => {
        if (selectId === 'structure2') {
            setShowSecondInput(event.target.value !== "---");
            if (event.target.value === "---") setInputValue2(0);
        } else {
            if (event.target.value != StructureType.LIST) select2.current!.value = StructureType.EMPTY;
        }
        handleSelectChange?.call(null, [select1.current!.value as StructureType, select2.current!.value as StructureType]);
    };

    const handleInput = (event: ChangeEvent<HTMLInputElement>, inputNumber: number) => {
        let value = parseInt(event.currentTarget.value);

        if (Number.isNaN(value)) value = 0; 

        if (inputNumber === 1) {
            setInputValue1(value);
        } else {
            setInputValue2(value);
        }
    };

    useEffect(() => {
        console.log(inputValue1, inputValue2);
        handleInputChange?.call(null, [inputValue1, inputValue2]);
    }, [inputValue1, inputValue2, handleInputChange]);

    return (
        <div id="menu" className={className}>
            <div id="data-input" className="flex flex-row gap-x-2 m-2">
                <input
                    className="border border-1 border-black rounded px-2 w-12"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    value={inputValue1}
                    onChange={e  => handleInput(e,1)}
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
                    value={inputValue2}
                    onChange={e => handleInput(e,2)}
                    onKeyDown={(event) => {
                        if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                            event.preventDefault();
                        }
                    }}
                />
                {
                    actions.map((action, index) => (
                        <button key={index} className="border border-1 border-black rounded px-2" onClick={ () => action.action(inputValue1, inputValue2) }>{t(action.name)}</button>
                    ))
                }
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Clear')}>{t('buttons.clear')}</button>
            </div>
            <div id="structure-selection" className="flex flex-row gap-x-2 m-2">
                {/* <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'New')}>New</button> */}
                <button className="border border-1 border-black rounded px-2" onClick={() => handleButtonClick?.call(null, 'Default')}>{t('buttons.create-default')}</button>
                <select
                    ref={select1}
                    defaultValue={dataStructureSelection[0]}
                    className="border border-1 border-black rounded px-2"
                    onChange={(event) => handleSelect(event, 'structure1')}
                >
                    {
                        Object.values(StructureType)
                            .filter(a => a != StructureType.EMPTY && a != StructureType.VECTOR)
                            .map((type) => <option key={type} value={type}>{t(`data-structures.${type}`)}</option>) 
                    }
                </select>
                <select
                    ref={select2}
                    defaultValue={dataStructureSelection[1]}
                    className="border border-1 border-black rounded px-2"
                    onChange={(event) => handleSelect(event, 'structure2')}
                >
                    {
                        Object.values(StructureType)
                        .filter(a => !(a == StructureType.VECTOR || (dataStructureSelection[0] != StructureType.LIST && a != StructureType.EMPTY)))
                        .map((type) => <option key={type} value={type}>{t(`data-structures.${type}`)}</option>) 
                    }
                </select>
            </div>
        </div>
    );
};