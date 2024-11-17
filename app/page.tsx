"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Menu from "./menu";
import { createDefaultStructure, createStructure, setContext, Structure, StructureType, setIntervalMS as setGeneratorPause } from "./datastructures";

let DATA_STRUCTURE: Structure ;

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const startDragOffset = useRef({ x: 0, y: 0 });

	const [ origin, setOrigin ] = useState({ x: 0, y: 0 });
	const [ isDragging, setIsDragging ] = useState(false);
	const [ speed, setSpeed ] = useState(80); 
	const [ inputValue1, setInputValue1 ] = useState(0);
	const [ inputValue2, setInputValue2 ] = useState(0);
	const [ dataStructureSelection, setDataStructureSelection ] = useState([StructureType.LIST, StructureType.EMPTY] as [StructureType, StructureType]);

	useLayoutEffect(() => {
		function updateSize() {
			if(!canvasRef.current) return ;

			const canvas = canvasRef.current;
			canvas.width        = canvas.parentElement!.offsetWidth  * 0.95;
			canvas.height       = canvas.parentElement!.offsetHeight * 0.95;
			canvas.style.width  = canvas.width + 'px';
			canvas.style.height = canvas.height + 'px';
			setContext(canvas.getContext('2d')!, origin.x, origin.y, () => Render(canvas, canvas.getContext('2d')!, origin));
			Render(canvas, canvas.getContext('2d')!, origin);
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

		const canvas = canvasRef.current;
		
		if (canvas) {
			canvas.addEventListener('mousedown', handleMouseDown);
			canvas.addEventListener('mousemove', handleMouseMove);
			canvas.addEventListener('mouseup', handleMouseUp);
		}

		window.addEventListener('resize', updateSize);
		updateSize();

		return () => {
			window.removeEventListener('resize', updateSize);
			if (canvas) {
				canvas.removeEventListener('mousedown', handleMouseDown);
				canvas.removeEventListener('mousemove', handleMouseMove);
				canvas.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}, [isDragging, origin]);

	useEffect(() => {
		if(!canvasRef.current) return ;
		console.log(`Select changed to [${dataStructureSelection.toString()}]`);
		DATA_STRUCTURE = createStructure(...dataStructureSelection)!;

		Render(canvasRef.current!, canvasRef.current!.getContext('2d')!, origin);
	}, [dataStructureSelection]);

	useEffect(() => {
		// 1000ms - [% to 0-1000ms range]
		setGeneratorPause(1000 - (speed * 10));
	}, [speed]);

	useEffect(() => {
			// Prevent zooming gestures on the site's document
			// @todo: zoom canvas
			document.addEventListener("gesturestart", function (e) {
				e.preventDefault();
			});
			
			document.addEventListener("gesturechange", function (e) {
				e.preventDefault();
			});

			document.addEventListener("gestureend", function (e) {
				e.preventDefault();
			});

			if(!canvasRef.current) return ;
			setContext(canvasRef.current!.getContext('2d')!, origin.x, origin.y, () => Render(canvasRef.current!, canvasRef.current!.getContext('2d')!, origin));
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

		Render(canvasRef.current!, canvasRef.current!.getContext('2d')!, origin);
	};

	function Render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, center: { x: number, y: number }) {
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
				actions={ DATA_STRUCTURE?.getActions() || [] }
				triggerRender={() => Render(canvasRef.current!, canvasRef.current?.getContext('2d')!, origin)}
				handleButtonClick={handleButtonClick}
				handleSelectChange={setDataStructureSelection}
			/>

			<div className="flex flex-col justify-center items-center w-full !h-[60vh]">
				<canvas
					ref={canvasRef}
					className="self-center border border-gray-300 rounded h-[95%] w-[95%]"
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
