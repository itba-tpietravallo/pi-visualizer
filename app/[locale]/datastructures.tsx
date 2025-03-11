let cmpAsStrings = false;
let cmp: (a: any, b: any) => number = cmpAsStrings ? (a,b) => a.toString().localeCompare(b.toString()) : (a,b) => a - b;

export class Canvas {
    private elements: DrawableElement[] = [];
    private zoom: number = 1;
    private offsetX = 100;
    private offsetY = 100;
    private ctx: CanvasRenderingContext2D | null = null;
    private intervalMS = 200;
    private lastTimerResolve: ((value: unknown) => void) | null = null;
    private drawPointers: boolean = false;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    addElement(element: DrawableElement) {
        element.showPointers(this.drawPointers);
        this.elements.push(element);
    }

    dropAllElements() {
        this.elements = [];
        this.clear();
    }

    replaceElements(...elements: DrawableElement[]) {
        this.elements = elements;
        this.showPointers(this.drawPointers);
        this.render();
    }

    draw() {
        this.elements.forEach((element) => element.draw(this));
    }

    clear() {
        this.ctx?.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    render() {
        this.clear();
        this.draw();
    }

    setZoom(deltaZoom: number) {
        if (this.zoom + deltaZoom < 0.1) return ;
        this.zoom += deltaZoom;
    }

    setOffset(offsetX: number, offsetY: number) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    setIntervalMs(intervalMS: number) {
        this.intervalMS = intervalMS;
        if (this.lastTimerResolve != null) this.lastTimerResolve!(null);
    }

    pause() {
        this.setIntervalMs(0x7FFFFFFF);
    }

    stepNext() {
        this.lastTimerResolve?.(null);
    }

    getZoom() {
        return this.zoom;
    }

    getContext() {
        return this.ctx;
    }

    getOffset() {
        return [ this.offsetX, this.offsetY ];
    }

    preserveSettings() {
        return [ this.ctx?.font, this.ctx?.fillStyle, this.ctx?.strokeStyle, this.ctx?.lineWidth, this.ctx?.textAlign, this.ctx?.textBaseline, this.ctx?.getLineDash() ] as const;
    }

    restoreSettings(values: ReturnType<Canvas["preserveSettings"]>) {
        if (!this.ctx) return ;
        this.ctx.font = values[0]!;
        this.ctx.fillStyle = values[1]!;
        this.ctx.strokeStyle = values[2]!;
        this.ctx.lineWidth = values[3]!;
        this.ctx.textAlign = values[4]!;
        this.ctx.textBaseline = values[5]!;
        this.ctx.setLineDash(values[6]!);
    }

    wrapGenerator(generator: Generator<Node | null, Node | boolean | null, any>) {
        const wait = (ms: number) => new Promise(resolve => (this.lastTimerResolve = resolve, setTimeout(resolve, ms)));
        
        Promise.resolve().then(async () => {
            let res: IteratorResult<Node | null, Node | boolean | null> ;
            let prevNode = undefined;
            while (res = generator.next()) {
                if (prevNode && typeof prevNode != "boolean") prevNode.setHightlight(this, false);
                prevNode = res.value;
                if (prevNode && typeof prevNode != "boolean") prevNode.setHightlight(this, true);
                if (res.done) {
                    // Needs to trigger a full re-render so position-color-size information flows down from the parent structures
                    // There's probably a better way to achieve this...
                    // (Only required on insert)
                    this.render();
    
                    await wait(this.intervalMS);
                    break ;
                }
                await wait(this.intervalMS);
            }

            if (typeof res?.value != "boolean") res?.value?.setHightlight(this, false);
            // Needs to trigger a full re-render so removed nodes are not drawn
            // (Only required on remove)
            this.render();
        });
    }

    // Tests for a hit against any drawn element
    // Coordinates for the test are 0-width, 0-height in canvas space
    checkIntersection(x: number, y: number) {
        const zoom = this.getZoom();
        const [ offsetX, offsetY ] = this.getOffset();

        const elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
            const elem = elements[i];
            const size = elem.size * zoom;
            const elemX = elem.x * zoom + offsetX;
            const elemY = elem.y * zoom + offsetY;

            // @todo Support circular nodes/ arbitrary bounding boxes defined by each DrawableElement
            if (x >= elemX && x <= elemX + size && y >= elemY && y <= elemY + size) {
                console.log('Intersection with element:', elem);
                return elem;
            }
        }
        return null;
    }

    showPointers(bool: boolean) {
        this.drawPointers = bool;
        this.elements.forEach((element) => element.showPointers(bool));
        return this;
    }

    compareAsStrings(bool: boolean) {
        cmpAsStrings = bool;
    }
}

export abstract class DrawableElement {
    public x: number = 0;
    public y: number = 0;
    public size: number = 0;
    protected color: string = '';
    protected highlight: boolean = false;
    protected drawPointers: boolean = false;

    abstract draw(canvas: Canvas): DrawableElement;

    setDefaultDrawAttributes() {
        this.setPos(0, 0);
        this.setSize(75);
        this.setColor('rgb(0, 0, 0)');
        return this;
    }

    setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }

    setSize(size: number) {
        this.size = size;
        return this;
    }

    setColor(color: string) {
        this.color = color;
        return this;
    }

    setHightlight(canvas: Canvas, bool: boolean) {
        this.highlight = bool;
        this.draw(canvas);
        return this;
    }

    showPointers(bool: boolean) {
        this.drawPointers = bool;
        return this;
    }

    static drawArrow(Canvas: Canvas, fromx: number, fromy: number, tox: number, toy: number, fromSize: number, toSize: number) {
        if (Canvas && Canvas.getContext()) {
            const zoom = Canvas.getZoom();
            const ctx = Canvas.getContext()!;
            const [ offsetX, offsetY ] = Canvas.getOffset();

            fromx *= zoom;
            fromy *= zoom;
            tox *= zoom;
            toy *= zoom;
            fromSize *= zoom;
            toSize *= zoom;

            ctx.strokeStyle = 'rgb(0, 0, 0)';
            let diffX = tox - fromx;
            const diffY = toy - fromy;

            // Draw a horizontal line and then subtract the horizontal distance from the arrow to be drawn
            // So that the arrow begins to be drawn where the horizontal line ends
            const angle = Math.abs(Math.atan2((toy + toSize / 2) - (fromy + fromSize / 2), (tox + toSize / 2) - (fromx + fromSize / 2)))
            if (angle * 57.29577 >= 5) {
                tox += toSize / 2;
                diffX += toSize / 2;
                const len = diffX - fromSize;
                ctx.beginPath();
                ctx.moveTo(fromx + offsetX + fromSize / 2 , fromy + offsetY + fromSize / 2);
                ctx.lineTo(fromx + len + offsetX + fromSize, fromy + offsetY + fromSize / 2);
                ctx.stroke();
                fromx += len;
                toy += (Vector.border_size * zoom + toSize / 2) * (diffY < 0 ? 1 : -1);
            } else {
                tox -= Vector.border_size;
            }
            
            if (Math.abs(diffX) < 0.001) {
                if (diffY > 0) {
                    this.canvasArrow(ctx, fromx + fromSize / 2 + offsetX, fromy + fromSize + offsetY, tox + toSize / 2 + offsetX, toy + offsetY, zoom);
                } else {
                    this.canvasArrow(ctx, fromx + fromSize / 2 + offsetX, fromy + offsetY, tox + toSize / 2 + offsetX, toy + toSize + offsetY, zoom);
                }
            } else {
                if (diffX > 0) {
                    this.canvasArrow(ctx, fromx + fromSize + offsetX, fromy + fromSize / 2 + offsetY, tox + offsetX, toy + toSize / 2 + offsetY, zoom);
                } else {
                    this.canvasArrow(ctx, fromx + offsetX, fromy + fromSize / 2 + offsetY, tox + toSize + offsetX, toy + toSize / 2 + offsetY, zoom);
                }
            }
        }
    }

    // https://stackoverflow.com/a/6333775
    protected static canvasArrow(context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, head_size: number) {
        context.beginPath();
        const headlen = 10 * head_size; // length of head in pixels
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        context.moveTo(fromx, fromy);
        context.lineTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        context.moveTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        context.stroke();
    }
}

export abstract class Structure extends DrawableElement {
    public readonly allowDuplicates: boolean = true;
    protected abstract type: StructureType;
    protected display: Display = Display.HORIZONTAL;
    protected performActionInPlace: boolean = false;

    abstract insert(...vals: any[]): Generator<Node | null, Node | null>;
    /**
     * Note: This method shall YIELD the node that is being removed, instead of returning it, and returns a boolean indicating whether the node was removed or not.
     * This is to allow wrapGenerator to highlight the node being removed.
     */
    abstract remove(...vals: any[]): Generator<Node, boolean>;
    abstract search(...vals: any[]): Generator<Node, Node | null>;
    abstract iterateElements(): Generator<DrawableElement | null>;
    abstract getActions(canvas: Canvas): { name: string, modifier?: string[], action: (...vals: any[]) => void }[];

    applyToElements(fn : (elem: DrawableElement) => void) {
        for (const elem of this.iterateElements()) {
            if (elem) fn(elem);
        }
    };

    setDisplay(display: Display): Structure {
        this.display = display;
        return this;
    }

    setPerformActionInPlace(performActionInPlace: boolean): Structure {
        this.performActionInPlace = performActionInPlace;
        return this;
    }
}

export enum StructureType {
    STATIC_VECTOR = 'Vector (static, size 5)',
    VECTOR = 'Vector (dynamic)',
    LIST = 'Linked List',
    QUEUE = 'Queue',
    STACK = 'Stack',
    LISTADT = 'ListADT',
    QUEUEADT = 'QueueADT',
    STACKADT = 'StackADT',
    VECTORADT = 'VectorADT',
    STATIC_VECTORADT = 'StaticVectorADT',
    EMPTY = '---',
}

export enum Display {
    HORIZONTAL = 'Horizontal',
    VERTICAL = 'Vertical'
}

export enum NodeType {
    RECTANGULAR = 'Rectangular',
    CIRCULAR = 'Circular',
    VECTOR = 'VectorNode',
}

export class Node extends DrawableElement {
    public type: NodeType = NodeType.CIRCULAR;
    protected memoryAddr: number = 0xFFFF;

    constructor(public key: any, public value: any, public next: Node | null = null) {
        super();
        console.log(`new node with values:`, key, value, next);
    }

    toString() {
        if (this.value == null && !this.key && typeof this.key != 'number') {
            return this.value === null ? "null" : "undefined";
        };
        const t = (typeof this.value == "string" || typeof this.value == 'number') ? this.value.toString() : this.key.toString()
        return t;
    }

    equals(other: Node) {
        return this.key === other.key;
    }

    setType(type: NodeType) {
        this.type = type;
        return this;
    }

    draw(Canvas: Canvas) {
        if (!Canvas || !Canvas.getContext()) return this;

        const prev = Canvas.preserveSettings();

        const zoom = Canvas.getZoom();
        const ctx = Canvas.getContext()!;
        const [ offsetX, offsetY ] = Canvas.getOffset();

        const x = this.x * zoom;
        const y = this.y * zoom;
        const size = this.size * zoom;

        ctx.fillStyle = this.color || 'rgb(255, 0, 255)';
        ctx.strokeStyle = this.highlight ? 'rgb(255,0,0)' : ctx.fillStyle;
        ctx.lineWidth = 3;

        if (this.type === NodeType.CIRCULAR && !this.drawPointers) {
            ctx.beginPath();
            ctx.arc(x + size / 2 + offsetX, y + size / 2 + offsetY, size / 2, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if ((this.type === NodeType.RECTANGULAR || this.type === NodeType.VECTOR)  || this.drawPointers) {
            ctx.fillRect(x + offsetX, y + offsetY, size, size);
            ctx.strokeRect(x + offsetX, y + offsetY, size, size);
        }

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.drawPointers) {
            let fontSize = 16 * zoom;
            ctx.font = `${Math.ceil(fontSize * 10) / 10}px Arial`;
            ctx.fillText(`value: ${this.toString()}`, x + size / 2 + offsetX, y + size / 2 - fontSize / 2 + offsetY);

            fontSize *= 0.6;
            ctx.font = `${Math.ceil(fontSize * 10) / 10}px Arial`;
            const str = this.type === NodeType.VECTOR ?
                `addr: 0x${this.memoryAddr.toString(16).toUpperCase().padStart(4, '0')}`:
                `next: ${ !this.next ? "null" : `&Node<${this.next.toString()}>` }`;
        
            ctx.fillText(str, x + size / 2 + offsetX, y + size / 2 + fontSize / 2 + offsetY);
        } else {
            const fontSize = 20 * zoom;
            ctx.font = `${Math.ceil(fontSize * 10) / 10}px Arial`;
            ctx.fillText(this.toString(), x + size / 2 + offsetX, y + size / 2 + offsetY);
        }

        Canvas.restoreSettings(prev);

        return this;
    }

    drawPointerToNext(canvas: Canvas) {
        if (this.next) {
            Node.drawArrow(canvas, this.x, this.y, this.next.x, this.next.y, this.size, this.next.size);
        }
    }

    setMemoryAddr(addr: number) {
        this.memoryAddr = addr;
        return this;
    }
}

export class Vector extends Structure {
    public readonly type: StructureType = StructureType.VECTOR;
    public static readonly separation = 1.2;
    public static readonly border_size = 5;
    public static readonly bgColor = 'silver';
    protected elements: (Node | null)[] = [];
    protected memoryAddr: number = Math.floor(Math.random() * 0x0FFF);

    constructor() {
        super();
    }

    static ofLength(length: number) {
        const vector = new Vector();
        for (let i = 0; i < length; i++) {
            if (i <= length * 0.3){
                exhaustGenerator(vector.insert(i));
            } else {
                vector.elements.push(null);
            }
        }
        return vector;
    }

    draw(canvas: Canvas) {
        if (this.elements.length == 0) return this;
        this.setPos(this.x, this.y);
        this.setSize(this.size);
        this.setColor(this.color);
        this.showPointers(this.drawPointers);
        const ctx = canvas.getContext()!;
        if (!ctx) throw new Error('Canvas context is null. Catastrophic');

        const [ offsetX, offsetY ] = canvas.getOffset();
        const zoom = canvas.getZoom();
        const size = this.size * zoom;
        let x = this.x * zoom;
        let y = this.y * zoom;
        const border = Vector.border_size * zoom;
        let width = (this.elements.length - 1) * (Vector.separation - 1) * size + this.elements.length * size + border;
        let height = size + border;
        if (this.display === Display.VERTICAL) [width, height] = [height, width];
        const settings = canvas.preserveSettings();

        ctx.strokeStyle = this.color;
        ctx.fillStyle = Vector.bgColor;
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        const renderMemoryInfo = this.drawPointers && this.display === Display.HORIZONTAL;
        const memoryInfoHeight = 30 * zoom * (renderMemoryInfo ? 1 : 0);
        height += memoryInfoHeight;
        ctx.fillRect(x + offsetX - border / 2, y + offsetY - border / 2 - memoryInfoHeight, width, height);
        ctx.strokeRect(x + offsetX - border / 2, y + offsetY - border / 2 - memoryInfoHeight, width, height);

        ctx.font = `${16 * zoom}px Arial`;
        ctx.fillStyle = 'rgb(0,0,0)';
        if (renderMemoryInfo) {
            ctx.fillText(`Memory address: 0x${this.memoryAddr.toString(16).toUpperCase().padStart(4, '0')}`, x + offsetX, y + offsetY - memoryInfoHeight + 20 * zoom);
        }

        canvas.restoreSettings(settings);

        x /= zoom;
        y /= zoom;
        for (let i = 0; i < this.elements.length; i++) {
            const elem = this.elements[i];
            if (elem != null && elem != undefined) {
                elem.draw(canvas);
            } else {
                ctx.fillStyle = this.color;
                let _x,_y;

                if (this.display === Display.HORIZONTAL) {
                    _x = x + i * Vector.separation * this.size;
                    _y = y;
                } else {
                    _x = x;
                    _y = y + i * Vector.separation * this.size;
                };

                if (this.drawPointers) {
                    new Node(null, "?", null)
                        .setDefaultDrawAttributes()
                        .setPos(_x, _y)
                        .setHightlight(canvas, false)
                        .showPointers(true)
                        .setType(NodeType.VECTOR)
                        .setMemoryAddr(this.memoryAddr + i)
                        .draw(canvas);
                } else
                    ctx.fillRect(_x * zoom + offsetX, _y * zoom + offsetY, this.size * zoom, this.size * zoom);
            }
        }

        return this;
    }

    setPos(x: number, y: number) {
        super.setPos(x, y);
        let currentX = x;
        let currentY = y;
        for (let i = 0; i < this.elements.length; i++) {
            const elem = this.elements[i];
            if (this.display === Display.HORIZONTAL) {
                elem?.setPos(currentX, y);
            } else {
                elem?.setPos(x, currentY);
            }
            currentX += this.size * Vector.separation;
            currentY += this.size * Vector.separation;
        }
        return this;
    }

    setColor(color: string) {
        super.setColor(color);
        this.elements.forEach((elem) => elem?.setColor(color));
        return this;
    }

    setSize(size: number) {
        super.setSize(size);
        this.elements.forEach((elem) => elem?.setSize(size));
        return this;
    }

    showPointers(bool: boolean) {
        super.showPointers(bool);
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i]?.showPointers(bool);
        }
        return this;
    }

    * insert(data: any, value: any = null) {
        if (this.elements[data]) {
            return this.elements[data];
        }
        const newNode = new Node(data, value);
        newNode.setType(NodeType.VECTOR);
        newNode.setMemoryAddr(this.memoryAddr + data);
        this.elements[data] = newNode;
        return newNode;
    }

    * remove(key: any) {
        if (key >= 0 && key < this.elements.length && this.elements[key]) {
            this.elements[key] = null;
            return true;
        }
        return false;
    }

    * search(key: any) {
        return this.elements[key];
    }

    * iterateElements() {
        for (let i = 0; i < this.elements.length; i++) {
            yield this.elements[i];
        }
        return null;
    }

    getActions(canvas: Canvas) {
        return [
            {
                name: 'buttons.insert',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.remove(data))
            },
            {
                name: 'buttons.search',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            },
        ];
    }

    getLength() {
        return this.elements.length;
    }
}

export class StaticVector extends Vector {
    public readonly type: StructureType = StructureType.STATIC_VECTOR;
    public static readonly DEFAULT_SIZE = 5;
    
    constructor() {
        super();
        this.elements = new Array(StaticVector.DEFAULT_SIZE).fill(null);
    }

    static ofLength(length: number): StaticVector {
        const vector = new StaticVector();
        vector.elements = new Array(length).fill(null);
        for (let i = 0; i < length; i++) {
            if (i < length * 0.3) {
                exhaustGenerator(vector.insert(i));
            }
        }
        return vector;
    }

    // @ts-expect-error eslint
    * insert(data: any, value: any = null) {
        if (data < this.elements.length) {
            return yield * super.insert(data, value);
        } else {
            return null;
        }
    }

    getActions(canvas: Canvas) {
        return [
            {
                name: 'buttons.insert',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.remove(data))
            },
            {
                name: 'buttons.search',
                modifier: ['index'],
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            },
        ];
    }
}

export class List extends Structure {
    public type: StructureType = StructureType.LIST;
    public nodeType: NodeType = NodeType.CIRCULAR;

    head: Node | null = null; // new Node(null, null, null)

    constructor(public readonly allowDuplicates: boolean = true) {
        super();
    }

    static ofLength(length: number) {
        const list = new List();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(list.insert(i));
        }
        return list;
    }

    draw(canvas: Canvas) {
        this.setPos(this.x, this.y);
        this.setSize(this.size);
        this.setColor(this.color);
        this.showPointers(this.drawPointers);
        let current = this.head;
        while (current) {
            current.draw(canvas);
            current.drawPointerToNext(canvas);
            current = current.next;
        }
        return this;
    }

    setPos(x: number, y: number) {
        super.setPos(x, y);
        let current = this.head;
        while (current) {
            current.setPos(x, y);

            if (this.display === Display.HORIZONTAL) {
                x += this.size * 1.5;
            } else {
                y += this.size * 1.5;
            }

            current = current.next;
        }
        return this;
    }

    setColor(color: string) {
        super.setColor(color);
        this.applyToElements((elem) => elem.setColor(color));
        return this;
    }

    setSize(size: number) {
        super.setSize(size);
        this.applyToElements((elem) => elem.setSize(size));
        return this;
    }

    showPointers(bool: boolean) {
        super.showPointers(bool);
        this.applyToElements((elem) => elem.showPointers(bool));
        return this;
    }

    setNodeType(type: NodeType) {
        this.nodeType = type;
        this.applyToElements((elem) => (elem as Node).setType(type));
        return this;
    }

    * insert(data: any, value: any = null) {
        if (this.head === null) {
            this.head = new Node(data, value, null);
            return this.head;
        }

        if (cmp(data, this.head.key) < 0) {
            this.head = new Node(data, value, this.head);
            return this.head;
        }

        let current: Node = this.head;

        yield current;

        if (cmp(this.head.key, data) === 0 && !this.allowDuplicates) return this.head;

        while (current.next && cmp(data, current.next.key) > 0) {
            current = current.next;
            yield current;
        }

        if (!this.allowDuplicates && current.next && cmp(current.next.key, data) === 0) return current.next;

        current.next = new Node(data, value, current.next);
        return current.next;
    }

    * remove(key: any) {
        if (this.head === null) return false;

        if (cmp(this.head.key, key) === 0) {
            yield this.head;
            this.head = this.head.next;
            return true;
        }

        let current = this.head;
        yield current;
        while (current.next && cmp(current.next.key, key) <= 0) {
            if (cmp(current.next.key, key) == 0) {
                yield current.next ;
                current.next = current.next.next;
                return true;
            }
            current = current.next;
            yield current;
        }

        return false;
    }

    * search(key: any) {
        let current = this.head;
        while (current) {
            if (cmp(current.key, key) < 0) {
                yield current;
            }
            if (cmp(current.key, key) === 0) {
                return current;
            }
            current = current.next;
        }
        return null;
    }

    * iterateElements() {
        let current = this.head;
        while (current) {
            yield current;
            current = current.next;
        }
        return null;
    }

    getActions(canvas: Canvas): { name: string, modifier?: string[], action: (data: any) => void }[] {
        return [
            {
                name: 'buttons.insert',
                modifier: ['ordered'],
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: ['ordered'],
                action: (data: any) => canvas.wrapGenerator(this.remove(data))
            },
            {
                name: 'buttons.search',
                modifier: ['linear'],
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            },
        ];
    }

    setHightlight(canvas: Canvas, bool: boolean) {
        this.applyToElements((elem) => elem.setHightlight(canvas, bool));
        return this;
    }
}

export class Queue extends List {
    public readonly type: StructureType = StructureType.QUEUE;
    last: Node | null = null;

    constructor() {
        super(true);
    }

    static ofLength(length: number): Queue {
        const queue = new Queue();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(queue.insert(i));
        }
        return queue;
    }

    * insert (data: any, value: any = null) {
        if (this.head === null || this.last == null) {
            this.head = this.last = new Node(data, value, null);
            return this.head;
        }

        yield this.last;
        this.last.next = new Node(data, value, null);
        this.last = this.last.next;
        return this.last;
    }

    * remove() {
        if (this.head === null) return false;
        yield this.head;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }
        
        return true;
    }

    getActions(canvas: Canvas): { name: string, modifier?: string[], action: (data: any) => void }[] {
        return [
            {
                name: 'buttons.insert',
                modifier: ['last'],
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: ['first'],
                action: () => canvas.wrapGenerator(this.remove())
            },
            {
                name: 'buttons.search',
                modifier: ['linear'],
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            }
        ];
    }

    getLast() {
        return this.last;
    }
}

export class Stack extends List {
    public readonly type: StructureType = StructureType.STACK;

    constructor() {
        super(true);
    }

    static ofLength(length: number): Stack {
        const stack = new Stack();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(stack.insert(i));
        }
        return stack
    }

    * insert(data: any, value: any = null) {
        if (this.head) yield this.head;
        this.head = new Node(data, value, this.head);

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x -= this.size * 1.5;
            } else {
                this.y -= this.size * 1.5;
            }
        }

        return this.head;
    }

    * remove() {
        if (this.head === null) return false;
        yield this.head;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }

        return true;
    }

    getActions(canvas: Canvas): { name: string, modifier?: string[], action: (data: any) => void }[] {
        return [
            {
                name: 'buttons.insert',
                modifier: ['first'],
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: ['first'],
                action: () => canvas.wrapGenerator(this.remove())
            },
            {
                name: 'buttons.search',
                modifier: ['linear'],
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            }
        ];
    }
}

export class Composed extends Structure {
    protected head: Structure | null = null;
    protected mainActions: { name: string, modifier?: string[], action: (data: any) => void }[] = [];
    protected subtypeActions: { name: string, modifier?: string[], action: (data: any) => void }[] = [];
    constructor(protected type: StructureType, protected subtype: StructureType) {
        super();
        this.head = Composed.getNewStructure(type, subtype, true)!;

        // These two lines are required to get the action modifiers for the buttons. 
        // @refactor: getActions should probably be static and bound to the instance later on (?)... but then again, the Composed modifiers depend on the instance...
        // This is a bit hacky, but it works for now.
        this.mainActions = this.head.getActions({ wrapGenerator: () => {} } as any);
        this.subtypeActions = Composed.getNewStructure(subtype, undefined, false)!.getActions({ wrapGenerator: () => {} } as any);
    }

    draw(canvas: Canvas) {
        this.setDefaultDrawAttributes();
        this.head?.draw(canvas);
        this.head?.applyToElements(elem => {
            if (!(elem instanceof Node && elem.value instanceof Structure)) return ;

            // Set horizontal-vertical arrangement
            elem.value.setDisplay(this.display == Display.VERTICAL ? Display.HORIZONTAL : Display.VERTICAL);

            // Assign different shapes to the parent/child nodes if both structures are a List
            if (this.head instanceof List && elem.value instanceof List) {
                elem.value.setNodeType(this.head.nodeType == NodeType.CIRCULAR ? NodeType.RECTANGULAR : NodeType.CIRCULAR);
            }
            
            Composed.drawArrow(canvas, elem.x, elem.y, elem.value.x, elem.value.y, this.size, elem.size);
            elem.value.draw(canvas);
        });
        return this;
    }

    setPos(x: number, y: number) {
        super.setPos(x, y);
        this.head?.setPos(x, y);
        this.head?.applyToElements(elem => {
            if ((elem instanceof Node)) {
                (elem.value as Structure).setPos(
                    elem.x + (this.display == Display.VERTICAL ? this.size * 1.5 : 0),
                    elem.y + (this.display == Display.HORIZONTAL ? this.size * 1.5 : 0)
                );
            }
        });
        return this;
    }

    setColor(color: string) {
        super.setColor(color);
        this.applyToElements(e => e.setColor(color));
        return this;
    }

    setSize(size: number) {
        super.setSize(size);
        this.applyToElements(e => e.setSize(size));
        return this;
    }

    * insert(key: any, value: any) {
        if (this.head === null) {
            this.head = Composed.getNewStructure(this.type, this.subtype, true)!;
            const l = Composed.getNewStructure(this.subtype, undefined, false)!;
            yield * this.head.insert(key, l);
            return yield * l.insert(value, null);
        }

        const l = Composed.getNewStructure(this.subtype, undefined, false)!;

        const aux = yield * this.head.insert(key, l);
        yield aux;

        if (!aux) return aux ;

        // If the nested structure had to be added, set it's attr
        if (l != aux.value) {
            this.setDefaultDrawAttributes();
            l.setDefaultDrawAttributes();
        }
        
        return yield * aux.value.insert(value, null);
    }

    * remove(key: any, value: any) {
        const current: Node | null = (yield * this.head!.search(key));

        if (current != null) {
            yield current;
            return yield * current.value.remove(value);
        }

        return false;
    }

    * search(key: any, value: any): Generator<Node, Node | null> {
        const current: Node | null = (yield * this.head!.search(key));
        if (current != null) {
            yield current;
            return yield * current.value.search(value);
        }

        return null;
    }

    getActions(canvas: Canvas): { name: string, modifier?: string[], action: (...vals: any[]) => void }[] {
        const modifiers = (m1?: string[], m2?: string[]) => {
            if (m1 && m2) return m1.concat(m2);
            return m1 || m2 || [];
        };

        return [
            {
                name: 'buttons.insert',
                modifier: modifiers(this.mainActions[0].modifier, this.subtypeActions[0].modifier),
                action: (...vals: [any, any]) => canvas.wrapGenerator(this.insert(...vals))
            },
            {
                name: 'buttons.remove',
                modifier: modifiers(this.mainActions[1].modifier, this.subtypeActions[1].modifier),
                action: (...vals: [any, any]) => canvas.wrapGenerator(this.remove(...vals))
            },
            {
                name: 'buttons.search',
                modifier: modifiers(this.mainActions[2].modifier, this.subtypeActions[2].modifier),
                action: (...vals: [any, any]) => canvas.wrapGenerator(this.search(...vals))
            }
        ];
    }

    * iterateElements() {
        if (this.head == null) return ;
        for (const elem of this.head.iterateElements()) {
            yield elem;
            if (elem instanceof Node && elem.value != undefined && elem.value instanceof Structure) {
                yield * elem.value.iterateElements();
            }
        }
    }

    showPointers(bool: boolean) {
        super.showPointers(bool);
        this.head?.showPointers(bool);
        this.applyToElements(e => {
            e.showPointers(bool);
            if (e instanceof Node && e.value instanceof Structure) e.value.showPointers(bool);
        });
        return this;
    }

    static default(t1: StructureType = StructureType.LIST, t2: StructureType = StructureType.LIST): Composed {
        const composed = new Composed(t1, t2);
        if (t1 == StructureType.STATIC_VECTOR && t2 != StructureType.EMPTY) {
            composed.head = new StaticVector().setDefaultDrawAttributes();
            for (let i = 0; i < StaticVector.DEFAULT_SIZE; i++) {
                exhaustGenerator(composed.head.insert(i, this.getNewStructure(t2, undefined, false)?.setDefaultDrawAttributes()));
            }
        }
        exhaustGenerator(composed.insert(0, 0));
        exhaustGenerator(composed.insert(1, 0));
        exhaustGenerator(composed.insert(1, 1));
        exhaustGenerator(composed.insert(2, 0));
        exhaustGenerator(composed.insert(2, 1));
        exhaustGenerator(composed.insert(2, 2));
        return composed;
    }

    static getNewStructure(type: StructureType, subtype?: StructureType, isHead: boolean = false): Structure | undefined {
        switch (type) {
            case StructureType.STATIC_VECTOR:
                if (isHead && subtype) {
                    const sv = new StaticVector().setDefaultDrawAttributes();
                    for (let i = 0; i < StaticVector.DEFAULT_SIZE; i++) {
                        exhaustGenerator(sv.insert(i, this.getNewStructure(subtype, undefined, false)?.setDefaultDrawAttributes()));
                    }
                    return sv;
                }
                return new StaticVector().setDefaultDrawAttributes();
            case StructureType.VECTOR:
                return new Vector().setDefaultDrawAttributes();
            case StructureType.LIST:
                // No not allow duplicates in parent list
                return new List(!isHead).setDefaultDrawAttributes();
            case StructureType.QUEUE:
                return new Queue().setDefaultDrawAttributes();
            case StructureType.STACK:
                return new Stack().setDefaultDrawAttributes();
            default:
                return undefined;
        }
    }
}

export abstract class ADT extends Structure {
    title: string | undefined;
    structure: Structure | null = null;
    protected drawStructure = false;
    protected elemCount = 0;
    protected iterator: Generator<DrawableElement | null, any, any> | null = null;
    protected current: Node | null = null;
    protected drawPointers: boolean = false;

    constructor() {
        super();
    }
    
    getActions(canvas: Canvas): { name: string, modifier?: string[], action: (...data: any[]) => void }[] {
        const modifiers = this.structure?.getActions(canvas).map(a => a.modifier)!;
        return [
            {
                name: 'buttons.insert',
                modifier: modifiers[0]!,
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'buttons.remove',
                modifier: modifiers[1]!,
                action: (data: any) => {
                    this.iteratorReset();
                    canvas.wrapGenerator(this.remove(data))
                }
            },
            {
                name: 'buttons.search',
                modifier: modifiers[2]!,
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            },
            {
                name: 'buttons.iterator-begin',
                action: () => {
                    this.iteratorBegin();
                    canvas.render();
                },
            },
            {
                name: 'buttons.iterator-next',
                action: () => {
                    this.iteratorNext();
                    canvas.render();
                },
            }
        ]
    }

    getFields() {
        return [
            { label: 'elems', value: this.structure! },
            { label: 'elemCount', value: this.elemCount.toString() },
            { label: 'iter', value: this.current }
        ];
    }
    
    applyToElements(fn: (elem: DrawableElement) => void) {
        this.structure?.applyToElements(fn);
    }

    setDefaultDrawAttributes() {
        super.setDefaultDrawAttributes();
        this.size = 200;
        return this;
    }

    drawContainer(canvas: Canvas, x: number, y: number, width: number, height: number, title: string) {
        const ctx = canvas.getContext()!;
        const zoom = canvas.getZoom();
        // Draw the main rectangle
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width * zoom, height * zoom);
  
        // Draw the title
        ctx.font = `${18 * zoom}px Arial`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(title, x + width * zoom / 2, y + 25 * zoom);
    }

    drawField(canvas: Canvas, x: number, y: number, width: number, height: number, label: string, value: string | DrawableElement | null) {
        const prev = canvas.preserveSettings();
        const ctx = canvas.getContext()!;
        const zoom = canvas.getZoom();
        const [ offsetX, offsetY ] = canvas.getOffset();
        const transformedX = x * zoom + offsetX;
        const transformedY = y * zoom + offsetY;
        height *= zoom;
        width *= zoom;
        const padding = 5 * zoom;
        // Draw the field rectangle
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(transformedX, transformedY, width, height);
  
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(transformedX, transformedY, width, height);
  
        // Draw the label and value
        ctx.font = `${14 * zoom}px Arial`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}:`, transformedX + padding, transformedY + height / 2 + padding);
  
        ctx.textAlign = 'right';

        if (value instanceof DrawableElement) {
            ctx.font = `${35 * zoom}px Arial`;
            ctx.textBaseline = 'middle';
            ctx.fillText('*', transformedX + width - padding, transformedY + height / 2 + padding * 1.5);
            if (value instanceof Structure) {
                if (this.drawStructure) {
                    value.setPos(x + 225, y - (this.drawPointers ? 19.5 : 10));
                    value.setSize(this.drawPointers ? 75 : 50);
                    Node.drawArrow(canvas, x + width / zoom - 30, y, value.x, value.y, height / zoom, value.size);
                    value.draw(canvas);
                }
            } else if (value instanceof Node) {
                Node.drawArrow(canvas, x + width / zoom - 15, y, value.x, value.y, height / zoom, value.size);
            } else {
                ctx.fillText('NOT IMPLEMENTED', transformedX + width - padding, transformedY + height / 2 + padding);
            }
        } else {
            ctx.fillText(value?.toString() || "null", transformedX + width - padding, transformedY + height / 2 + padding);
        }

        canvas.restoreSettings(prev);
    }

    draw(canvas: Canvas) {
        const prev = canvas.preserveSettings();

        const [ offsetX, offsetY ] = canvas.getOffset();
        const zoom = canvas.getZoom();
        const x = this.x;
        const y = this.y;

        const fields = this.getFields();

        const fieldHeight = 30; // Height of each field
        const padding = 10; // Padding around the content
  
        // Calculate the height of the main rectangle based on fields
        const height = 50 + fields.length * (fieldHeight + 5);
  
        // Draw the main rectangle
        this.drawContainer(canvas, x * zoom + offsetX, y * zoom + offsetY, this.size, height, this.title || this.type);
  
        // Draw each field inside the main rectangle
        let currentY = y + 40; // Starting position for fields
        
        fields.forEach(field => {
            this.drawField(canvas, x + padding, currentY, this.size - 2 * padding, fieldHeight, field.label, field.value);
            currentY += fieldHeight + 5;
        });

        canvas.restoreSettings(prev);

        return this;
    }

    * insert(data: any, value: any = null) {
        this.drawStructure = true;
        const has = exhaustGenerator(this.structure!.search(data));
        const node = yield * this.structure!.insert(data, value);
        if ( (this.allowDuplicates && node) || (!has && node != undefined && node != null)) this.elemCount++;
        return node;
    }

    * remove(data?: any) {
        const nodeRemoved = yield * this.structure!.remove(data);
        if (nodeRemoved) this.elemCount--;
        if (this.elemCount == 0) this.drawStructure = false;
        return nodeRemoved;
    }

    * search(data: any) {
        return yield * this.structure!.search(data);
    }

    * iterateElements() {
        if (!this.structure) return ;
        return yield * this.structure.iterateElements();
    }

    showPointers(bool: boolean) {
        this.drawPointers = bool;
        this.structure?.showPointers(bool);
        return this;
    }

    iteratorBegin() {
        this.iterator = this.iterateElements();
        this.current = this.iterator.next().value;
    }

    iteratorNext() {
        this.current = this.iterator?.next().value;
    }

    iteratorReset() {
        this.current = null;
        this.iterator = null;
    }
}

export class ListADT extends ADT {
    protected type: StructureType = StructureType.LISTADT;

    constructor() {
        super();
        this.structure = new List(false).setDefaultDrawAttributes();
    }

    static ofLength(length: number) {
        const list = new ListADT();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(list.insert(i));
        }
        return list;
    }
}

export class QueueADT extends ListADT {
    protected type: StructureType = StructureType.QUEUEADT;

    constructor() {
        super();
        this.structure = new Queue().setDefaultDrawAttributes();
    }

    getFields(): ({ label: string; value: Structure; } | { label: string; value: string; } | { label: string; value: Node | null; })[] {
        return super.getFields().concat([
            { label: 'last', value: (this.structure as Queue).getLast() }
        ]);
    }

    static ofLength(length: number) {
        const queue = new QueueADT();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(queue.insert(i));
        }
        return queue;
    }
}

export class StackADT extends ListADT {
    protected type: StructureType = StructureType.STACKADT;

    constructor() {
        super();
        this.structure = new Stack().setDefaultDrawAttributes();
    }

    static ofLength(length: number) {
        const stack = new StackADT();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(stack.insert(i));
        }
        return stack;
    }

    getFields() {
        return super.getFields().map((f) => {
            if (f.label == 'elems') {
                f.label = 'first';
            }

            return f;
        });
    }
}

export class VectorADT extends ADT {
    structure: Structure | null = null;
    protected type: StructureType = StructureType.VECTORADT;

    constructor() {
        super();
        this.structure = new Vector().setDefaultDrawAttributes();
        this.drawStructure = true;
    }

    static ofLength(length: number) {
        const vector = new VectorADT();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(vector.insert(i));
        }
        return vector;
    }

    getFields(): ({ label: string; value: Structure; } | { label: string; value: string; } | { label: string; value: Node | null; })[] {
        return super.getFields().concat([
            { label: 'size', value: (this.structure as Vector).getLength().toString() }
        ]);
    }

    * remove(data: any) {
        const ret = yield * super.remove(data);
        this.drawStructure = true;
        return ret;
    }
}

export class StaticVectorADT extends VectorADT {
    structure: Structure | null;
    protected type: StructureType = StructureType.STATIC_VECTORADT;

    constructor() {
        super();
        this.structure = new StaticVector().setDefaultDrawAttributes();
    }

    static ofLength(length: number) {
        if (length > StaticVector.DEFAULT_SIZE) {
            throw new Error(`StaticVectorADT can only have a maximum length of ${StaticVector.DEFAULT_SIZE}`);
        }

        const vector = new StaticVectorADT();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(vector.insert(i));
        }
        return vector;
    }
}

export function createStructure(type: StructureType, subtype?: StructureType): Structure | undefined {
    if (subtype != undefined && subtype != StructureType.EMPTY) {
        return new Composed(type, subtype).setDefaultDrawAttributes();
    }
    
    switch (type) {
        case StructureType.VECTOR:
            return new Vector().setDefaultDrawAttributes();
        case StructureType.STATIC_VECTOR:
            return new StaticVector().setDefaultDrawAttributes();
        case StructureType.LIST:
            return new List().setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return new Queue().setDefaultDrawAttributes();
        case StructureType.STACK:
            return new Stack().setDefaultDrawAttributes();
        case StructureType.LISTADT:
            return new ListADT().setDefaultDrawAttributes();
        case StructureType.QUEUEADT:
            return new QueueADT().setDefaultDrawAttributes();
        case StructureType.STACKADT:
            return new StackADT().setDefaultDrawAttributes();
        case StructureType.VECTORADT:
            return new VectorADT().setDefaultDrawAttributes();
        case StructureType.STATIC_VECTORADT:
            return new StaticVectorADT().setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

export function createDefaultStructure(type: StructureType, subtype?: StructureType): Structure | undefined {
    if ( subtype != undefined && subtype != StructureType.EMPTY) {
        return Composed.default(type, subtype).setDefaultDrawAttributes();
    }

    switch (type) {
        case StructureType.VECTOR:
            return Vector.ofLength(3).setDefaultDrawAttributes();
        case StructureType.STATIC_VECTOR:
            return StaticVector.ofLength(5).setDefaultDrawAttributes();
        case StructureType.LIST:
            return List.ofLength(3).setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return Queue.ofLength(3).setDefaultDrawAttributes();
        case StructureType.STACK:
            return Stack.ofLength(3).setDefaultDrawAttributes();
        case StructureType.LISTADT:
            return ListADT.ofLength(3).setDefaultDrawAttributes();
        case StructureType.QUEUEADT:
            return QueueADT.ofLength(3).setDefaultDrawAttributes();
        case StructureType.STACKADT:
            return StackADT.ofLength(3).setDefaultDrawAttributes();
        case StructureType.VECTORADT:
            return VectorADT.ofLength(5).setDefaultDrawAttributes();
        case StructureType.STATIC_VECTORADT:
            return StaticVectorADT.ofLength(3).setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

function exhaustGenerator<T, R>(generator: Generator<T, R>) {
    let res: IteratorResult<T, R> ;
    while (res = generator.next()) {
        if (res.done) {
            break ;
        }
    }
    return res.value;
}
