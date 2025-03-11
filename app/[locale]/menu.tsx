import { ChangeEvent, Dispatch, LegacyRef, SetStateAction, useEffect, useRef, useState } from 'react';
import { StructureType, Structure } from './datastructures';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

const composable = [ StructureType.VECTOR, StructureType.STATIC_VECTOR, StructureType.LIST ] as string[];
const allowsStringTypes = [ StructureType.LIST, StructureType.QUEUE, StructureType.STACK, StructureType.LISTADT, StructureType.QUEUEADT, StructureType.STACKADT ] as string[];

export default function Menu({
    className,
    inputValue1,
    inputValue2,
    cmpAsStrings,
    setInputValue1,
    setInputValue2,
    setCmpAsStrings,
    dataStructureSelection,
    actions,
    handleButtonClick,
    handleSelectChange,
    handleInputChange,
    paused
}: {
    className?: string, 
    inputValue1: number,
    inputValue2: number,
    cmpAsStrings: boolean
    setInputValue1: (value: number) => void,
    setInputValue2: (value: number) => void,
    setCmpAsStrings: (value: boolean) => void,
    dataStructureSelection: string[],
    actions: ReturnType<Structure["getActions"]>, 
    handleButtonClick?: (action: string) => void,
    handleSelectChange?: Dispatch<SetStateAction<[StructureType, StructureType]>>,
    handleInputChange?: (input: [number, number]) => void,
    paused: boolean,
}) {
    const t = useTranslations();

    const [ showSecondInput, setShowSecondInput ] = useState(false);
    const [ select1, select2 ] = [useRef<HTMLSelectElement>(null), useRef<HTMLSelectElement>(null)];

    // Function to handle the change in select fields
    const handleSelect = (event: ChangeEvent<HTMLSelectElement>, selectId: string) => {
        if (selectId === 'structure2') {
            setShowSecondInput(event.target.value !== "---");
            if (event.target.value === "---") setInputValue2(0);
        } else {
            if (event.target.value != StructureType.LIST) {
                select2.current!.value = StructureType.EMPTY;
                setInputValue2(0);
                setShowSecondInput(false);
            };
        }
        handleSelectChange?.call(null, [select1.current!.value as StructureType, select2.current!.value as StructureType]);
    };

    useEffect(() => {
        console.log(inputValue1, inputValue2);
        handleInputChange?.call(null, [inputValue1, inputValue2]);
    }, [inputValue1, inputValue2, handleInputChange]);

    useEffect(() => {
        if (!allowsStringTypes.includes(dataStructureSelection[0]) || !cmpAsStrings) setInputValue1(0);
        if (!allowsStringTypes.includes(dataStructureSelection[1]) || !cmpAsStrings) setInputValue2(0);
    }, [cmpAsStrings, dataStructureSelection[0], dataStructureSelection[1]]);

    return (
        <form id="menu" className={clsx(className, "flex flex-col lg:flex-row gap-y-2 gap-x-2 w-[96%]")} onSubmit={e => (e.preventDefault(), false)}>
            <div id="structure-selection" className="flex flex-col gap-y-1 gap-x-2 m-2 flex-wrap rounded border border-1 border-black px-2 py-1">
                <div className='flex flex-col gap-2'>
                    <p>Select which structure to play with. You may select two to nest structures (Matrices, nested lists, etc)</p>
                    <div className='flex flex-row gap-2 flex-wrap'>
                        <SelectDataTypeInput ref={select1} defaultValue={dataStructureSelection[0]} primaryValue={dataStructureSelection[0]} onChange={(event) => handleSelect(event, 'structure1')} paused={paused} t={t}/>
                        <SelectDataTypeInput ref={select2} defaultValue={dataStructureSelection[1]} primaryValue={dataStructureSelection[0]} onChange={(event) => handleSelect(event, 'structure2')} paused={paused} t={t} secondaryInput={true}/>

                        <button form='menu' type="button" disabled={paused} className="border border-1 border-black rounded px-2 disabled:bg-gray-400 disabled:opacity-20" onClick={() => handleButtonClick?.call(null, 'Default')}>{t('buttons.create-default')}</button>
                        <button form='menu' type="button" disabled={paused} className="border border-1 border-black rounded px-2 disabled:bg-gray-400 disabled:opacity-20" onClick={() => handleButtonClick?.call(null, 'Clear')}>{t('buttons.clear')}</button>
                    </div>
                </div>
            </div>

            <div id="data-input" className="flex flex-col gap-y-1 gap-x-2 m-2 max-w-full flex-wrap rounded border border-1 border-black px-2 py-1">
                <div>
                    <p className='inline-block'>Input the data to use when performing actions &nbsp;</p>
                    <div className='inline-flex gap-2 items-center justify-start'>(<input type="checkbox" name="cmp-as-strings" id="cmp-as-strings" checked={cmpAsStrings} onChange={() => setCmpAsStrings(!cmpAsStrings)} /><label htmlFor='cmp-as-strings'>compare as strings</label>)</div>
                </div>
                <div className='flex flex-row gap-2'>
                <p>First key</p>
                <DataInputField form='menu' paused={paused} defaultValue={inputValue1} setter={setInputValue1} allowString={cmpAsStrings && allowsStringTypes.includes(dataStructureSelection[0])}/>
                <hr className="border-black border-l h-full"/>
                <p>Second key</p>
                <DataInputField form='menu' paused={paused || !showSecondInput} defaultValue={inputValue2} setter={setInputValue2} allowString={cmpAsStrings && allowsStringTypes.includes(dataStructureSelection[1])}/>
                </div>
                <div id='actions' className='flex flex-row gap-2'>
                {
                    actions.map((action, index) => (
                        <button form='menu' type='submit' disabled={paused} key={index} className="border border-1 border-black rounded px-2 disabled:bg-gray-400 disabled:opacity-20" onClick={ () => {
                            if ((document.getElementById('menu') as HTMLFormElement | undefined)?.reportValidity()) action.action(inputValue1, inputValue2);
                        }}>{t(action.name)}{ action.modifier?.filter(a => a).length ? ` (${action.modifier.map(m => t(`action-modifier.${m}`)).join(`, ${t(`action-modifier.then`)} `)})` : "" }</button>
                    ))
                }
                </div>
            </div>
        </form>
    );
};

function DataInputField({paused, form, defaultValue, setter, allowString}: {paused: boolean, form?: string, defaultValue: number | string, setter: ((value: number) => void) | ((value: string) => void), allowString?: boolean}) {
    const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
        let value: string | number = parseInt(event.currentTarget.value);

        if (Number.isNaN(value)) value = event.currentTarget.value; 

        // @ts-expect-error ignore number | string
        setter(value);
    };

    return allowString ?
    <input
        form={form}
        disabled={paused}
        className='border border-1 border-black rounded px-2 w-12 bg:white disabled:bg:gray disabled:opacity-20'
        type="text"
        value={defaultValue}
        onChange={e => (handleInput(e), e.currentTarget.reportValidity())}
        required
    /> :
    <input
        form={form}
        disabled={paused}
        className="border border-1 border-black rounded px-2 w-12 bg:white disabled:bg:gray disabled:opacity-20"
        type="text"
        inputMode="numeric"
        pattern="[0-9]+"
        value={defaultValue}
        onChange={e => (handleInput(e), e.currentTarget.reportValidity())}
        required
        onKeyDown={(event) => {
            if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
            }
    } } />;
}

function SelectDataTypeInput({ref, defaultValue, primaryValue, onChange, paused, t, secondaryInput }: {
            ref: LegacyRef<HTMLSelectElement>,
            defaultValue: string,
            primaryValue: string,
            onChange?: (event: ChangeEvent<HTMLSelectElement>) => void,
            paused: boolean,
            t: ReturnType<typeof useTranslations>,
            secondaryInput?: boolean
        }
    ) {

    return <select
        ref={ref}
        defaultValue={defaultValue}
        className="border border-1 border-black rounded px-2 disabled:bg-gray-400 disabled:opacity-20"
        disabled={paused}
        onChange={onChange}
    >
        {secondaryInput && <option value="---">{t('data-structures.---')}</option>}
        <optgroup label='1er parcial'>
            {<option key={StructureType.STATIC_VECTOR} value={StructureType.STATIC_VECTOR} disabled={!composable.includes(primaryValue) && secondaryInput}>{t(`data-structures.${StructureType.STATIC_VECTOR}`)}</option>}
        </optgroup>

        <optgroup label='2do parcial'>
            {Object.values(StructureType)
                .filter(a => a != StructureType.EMPTY && a != StructureType.STATIC_VECTOR && !a.toUpperCase().includes('ADT'))
                .map((type) => <option key={type} value={type} disabled={!composable.includes(primaryValue) && secondaryInput}>{t(`data-structures.${type}`)}</option>)}
        </optgroup>

        <optgroup label='2do parcial (ADTs)'>
            {Object.values(StructureType)
                .filter(a => a.toUpperCase().includes('ADT'))
                .map((type) => <option key={type} value={type} disabled={secondaryInput || (secondaryInput && !composable.includes(primaryValue)) }>{t(`data-structures.${type}`)}</option>)}
        </optgroup>
    </select>;
}
