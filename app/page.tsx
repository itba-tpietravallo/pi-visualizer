"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import Menu from "./menu";
import { createDefaultStructure, createStructure, setContext, Structure, StructureType, setIntervalMS as setGeneratorPause, setZoom } from "./datastructures";

let DATA_STRUCTURE: Structure | undefined;

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const startDragOffset = useRef({ x: 0, y: 0 });
	const startZoom = useRef(1);

	const [ origin, setOrigin ] = useState({ x: 0, y: 0 });
	const [ isDragging, setIsDragging ] = useState(false);
	const [ speed, setSpeed ] = useState(80); 
	const [ inputValue1, setInputValue1 ] = useState(0);
	const [ inputValue2, setInputValue2 ] = useState(0);
	const [ dataStructureSelection, setDataStructureSelection ] = useState([StructureType.LIST, StructureType.EMPTY] as [StructureType, StructureType]);
	const [ actions, setActions ] = useState<ReturnType<Structure["getActions"]>>([]);

	useLayoutEffect(() => {
		function updateSize() {
			if(!canvasRef.current) return ;

			const canvas = canvasRef.current;
			canvas.width        = canvas.parentElement!.offsetWidth  * 0.95;
			canvas.height       = canvas.parentElement!.offsetHeight * 0.95;
			canvas.style.width  = canvas.width + 'px';
			canvas.style.height = canvas.height + 'px';
			setContext(canvas.getContext('2d')!, origin.x, origin.y, () => Render(canvas, canvas.getContext('2d')!));
			Render(canvas, canvas.getContext('2d')!);
		}

		function handleMouseDown(e: MouseEvent) {
			setIsDragging(true);
			startDragOffset.current = { x: e.clientX - origin.x, y: e.clientY - origin.y };
		}

		function handleMouseMove(e: MouseEvent) {
			if (isDragging) {
				setOrigin({
					x: e.clientX - startDragOffset.current.x,
					y: e.clientY - startDragOffset.current.y,
				});
			}
		}

		function handleMouseUp() {
			setIsDragging(false);
		}

		function resetZoom() {
			startZoom.current = 1;
		}

		function zoom(e: WheelEvent) {
			const rect = canvasRef.current?.getBoundingClientRect()!;
			// @ts-expect-error gesture events (webkit specific)
			const touchevent = typeof e.scale == 'number';
			// @ts-expect-error gesture events (webkit specific)
			const s = touchevent ? e.scale : e.deltaY;
			const delta = touchevent ? (s - startZoom.current) : e.deltaY / 50;

			// Prevent zooming the page
			if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)
				e.preventDefault();

			const x = (rect.left - e.clientX) + origin.x;
			const y = (rect.top - e.clientY)  + origin.y;
			setZoom(delta);
			setOrigin({ x: origin.x + x * delta, y: origin.y + y * delta });
			startZoom.current = s;
			Render(canvasRef.current!, canvasRef.current!.getContext('2d')!);
		}

		const canvas = canvasRef.current;
		
		if (canvas) {
			canvas.addEventListener("wheel", zoom);
			canvas.addEventListener('mousedown', handleMouseDown);
			canvas.addEventListener("gesturestart", resetZoom);
			// @ts-expect-error gesture events (webkit specific)
			canvas.addEventListener("gesturechange", zoom);
			canvas.addEventListener("gestureend", resetZoom);
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		window.addEventListener('resize', updateSize);
		updateSize();

		return () => {
			window.removeEventListener('resize', updateSize);
			if (canvas) {
				canvas.removeEventListener("wheel", zoom);
				canvas.removeEventListener("gesturestart", resetZoom);
				// @ts-expect-error gesture events (webkit specific)
				canvas.removeEventListener("gesturechange", zoom);
				canvas.removeEventListener("gestureend", resetZoom);
				canvas.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}, [isDragging, origin]);

	useEffect(() => {
		if(!canvasRef.current) return ;
		console.log(`Select changed to [${dataStructureSelection.toString()}]`);
		DATA_STRUCTURE = createStructure(...dataStructureSelection)!;

		setActions(DATA_STRUCTURE?.getActions() || []);
		Render(canvasRef.current!, canvasRef.current!.getContext('2d')!);
	}, [dataStructureSelection]);

	useEffect(() => {
		// 1000ms - [% to 0-1000ms range]
		setGeneratorPause(1000 - (speed * 10));
	}, [speed]);

	const preventDefault = (e: Event) => e.preventDefault();

	useEffect(() => {
			// Prevent zooming gestures on the site's document
			// @todo: zoom canvas
			document.addEventListener("gesturestart", preventDefault);
			document.addEventListener("gesturechange", preventDefault);
			document.addEventListener("gestureend", preventDefault);

			return () => {
				document.removeEventListener("gesturestart", preventDefault);
				document.removeEventListener("gesturechange", preventDefault);
				document.removeEventListener("gestureend", preventDefault);
			}
	}, []);

	// Function to handle button clicks
	const handleButtonClick = (action: string) => {
		switch (action) {
			case 'New':
			case 'Clear':
				DATA_STRUCTURE = createStructure(...dataStructureSelection)!;
				break;
			case 'Default':
				DATA_STRUCTURE = createDefaultStructure(...dataStructureSelection)!;
				break;
			default:
			break;
		}

		setActions(DATA_STRUCTURE?.getActions() || []);
		Render(canvasRef.current!, canvasRef.current!.getContext('2d')!);
	};

	function Render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		DATA_STRUCTURE?.draw();
	}

  return (
	<main className="min-h-full w-full flex flex-col gap-y-4 bg-white/50 backdrop-blur rounded p-4 lg:p-16">
		<h1 className="text-xl">Data structures visualizer</h1>

		<hr className="border-black w-1/3"/>

		<div className="flex flex-col justify-center items-center">
			<Menu 
				className="pb-2"
				inputValue1={inputValue1}
				inputValue2={inputValue2}
				setInputValue1={setInputValue1}
				setInputValue2={setInputValue2}
				dataStructureSelection={dataStructureSelection}
				actions={actions}
				handleButtonClick={handleButtonClick}
				handleSelectChange={setDataStructureSelection}
			/>

			<div className="flex flex-col justify-center items-center w-full !h-[60vh]">
				<canvas
					ref={canvasRef}
					className="self-center border border-gray-300 rounded h-[95%] w-[95%] cursor-grab"
				/>
			</div>

			<div className="w-full flex flex-col items-start">
				<div className="inline-block">
					<p className="inline-block w-[120px]">Speed: {Math.round((speed))}%</p>
					<input className="inline-block" type="range" min="10" max="100" defaultValue={speed} onChange={(e) => setSpeed(e.target.valueAsNumber) } />
				</div>
				<p className="w-fit">Origin. x: {origin.x}, y: {origin.y}</p>
			</div>
		</div>

		<hr className="border-black w-1/3"/>

		<h2 className="text-3xl">Abstract Data Types</h2>

		<p>Abstract Data Types (ADTs) are a way to define a data structure in terms of the operations that can be performed on it, without specifying how these operations are implemented. This allows for a clear separation between the interface and the implementation of the data structure.</p>

		<p><b>Important:</b> This does not show a full ADT/CDT, only the underlying data strucures. In a real implementation, things like size/iteration fields would likely be present </p>

		<a className="text-blue-600 underline italic" href="https://drive.google.com/file/d/17VZRI6vXP_2iiNOnay4TkWqRTE_6jGTH/view?usp=sharing" target="_blank">PDF Guide with notes and drawings</a>

		<h2 className="text-3xl">Visualization</h2>

		<p>Here you can visualize the behavior of some of the most common data structures. You can create new instances, perform operations on them and see how they change in real time.</p>

		<p>Some operations are available on all data structures, like Search. Others may see their behaviour altered (for example a List may `insert` but a Queue will only `insert-last`). The operations displayed on the menu will correspond to the selected data types</p>

		<hr className="border-black w-1/3"/>
		
		<p>Created as a visual aid for the Imperative Programming course at ITBA (72.31).</p>
	</main>
  );
}
