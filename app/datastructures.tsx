export abstract class DrawableElement {
    protected x: number = 0;
    protected y: number = 0;
    protected size: number = 0;
    protected color: string = '';

    abstract draw(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): DrawableElement;

    setDrawAttributes(x: number, y: number, size: number, color: string) {
        this.size = size;
        this.color = color;
        this.x = x;
        this.y = y;
        return this;
    }

    setDefaultDrawAttributes() {
        this.setDrawAttributes(0, 0, 75, 'rgb(0, 0, 0)')
        return this;
    }

    setHightlight(bool: boolean, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        const prevColor = this.color;
        this.color = bool ? 'rgb(255, 0, 0)' : this.color;
        this.draw(ctx, offsetX, offsetY);
        this.color = prevColor;
        return this;
    }
}

export abstract class Structure extends DrawableElement {
    protected display: Display = Display.HORIZONTAL;
    protected performActionInPlace: boolean = false;

    abstract insert(data: any): void;
    abstract remove(data: any): void;
    abstract search(data: any): Node | null;
    abstract getActions(): { name: string, action: (data: any) => void }[];
    abstract applyToElements(fn : (elem: DrawableElement) => void): void;

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
    LIST = 'Linked List',
    QUEUE = 'Queue',
    STACK = 'Stack',
    VECTOR = 'Vector',
    EMPTY = '---'
}

export enum Display {
    HORIZONTAL = 'Horizontal',
    VERTICAL = 'Vertical'
}

export enum NodeType {
    RECTANGULAR = 'Rectangular',
    CIRCULAR = 'Circular'
}

export class Node extends DrawableElement {
    public type: NodeType = NodeType.CIRCULAR;

    constructor(public data: any, public next: Node | null = null) {
        super();
        this.data = data;
        this.next = next;
    }

    toString() {
        return this.data.toString();
    }

    equals(other: Node) {
        return this.data === other.data;
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        ctx.fillStyle = this.color || 'rgb(255, 0, 255)';

        if (this.type === NodeType.CIRCULAR) {
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2 + offsetX, this.y + this.size / 2 + offsetY, this.size / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === NodeType.RECTANGULAR) {
            ctx.fillRect(this.x + offsetX, this.y + offsetY, this.size, this.size);
        }

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial';
        ctx.fillText(this.data.toString(), this.x + this.size / 2 + offsetX, this.y + this.size / 2 + offsetY);
        return this;
    }

    drawPointerToNext(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        if (this.next) {
            ctx.strokeStyle = 'rgb(0, 0, 0)';
            const diffX = this.next.x - this.x;
            const diffY = this.next.y - this.y;
            
            if (Math.abs(diffX) < 0.001) {
                if (diffY > 0) {
                    canvasArrow(ctx, this.x + this.size / 2 + offsetX, this.y + this.size + offsetY, this.next.x + this.next.size / 2 + offsetX, this.next.y + offsetY);
                } else {
                    canvasArrow(ctx, this.x + this.size / 2 + offsetX, this.y + offsetY, this.next.x + this.next.size / 2 + offsetX, this.next.y + this.next.size + offsetY);
                }
            } else {
                if (diffX > 0) {
                    canvasArrow(ctx, this.x + this.size + offsetX, this.y + this.size / 2 + offsetY, this.next.x + offsetX, this.next.y + this.next.size / 2 + offsetY);
                } else {
                    canvasArrow(ctx, this.x + offsetX, this.y + this.size / 2 + offsetY, this.next.x + this.next.size + offsetX, this.next.y + this.next.size / 2 + offsetY);
                }
            }
        }
    }
}

export class List extends Structure {
    public readonly type: StructureType = StructureType.LIST;
    head: Node | null = null;

    constructor() {
        super();
    }

    static ofLength(length: number) {
        const list = new List();
        for (let i = 0; i < length; i++) {
            list.insert(i);
        }
        return list;
    }

    draw(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        let current = this.head;
        this.setDrawAttributes(this.x, this.y, this.size, this.color);
        while (current) {
            current.draw(ctx, offsetX, offsetY);
            current.drawPointerToNext(ctx, offsetX, offsetY);
            current = current.next;
        }
        return this;
    }

    setDrawAttributes(x: number, y: number, size: number, color: string) {
        super.setDrawAttributes(x, y, size, color);
        let current = this.head;
        while (current) {
            current.setDrawAttributes(x, y, size, color);

            if (this.display === Display.HORIZONTAL) {
                x += size * 1.5;
            } else {
                y += size * 1.5;
            }

            current = current.next;
        }
        return this;
    }

    insert(data: any) {
        if (this.head === null) {
            this.head = new Node(data, null);
            return;
        }

        if (data < this.head.data) {
            this.head = new Node(data, this.head);
            return;
        }

        let current = this.head;

        while (current.next && data > current.next.data) {
            current = current.next;
        }

        current.next = new Node(data, current.next);
    }

    remove(data: any) {
        if (this.head === null) return;

        if (this.head.data === data) {
            this.head = this.head.next;
            return;
        }

        let current = this.head;
        while (current.next && current.next.data <= data) {
            if (current.next.data === data) {
                current.next = current.next.next;
                return;
            }
            current = current.next;
        }
    }

    search(data: any) {
        let current = this.head;
        while (current) {
            if (current.data === data) {
                return current;
            }
            current = current.next;
        }
        return null;
    }

    getActions() {
        return [
            {
                name: 'Insert',
                action: (data: any) => this.insert(data)
            },
            {
                name: 'Remove',
                action: (data: any) => this.remove(data)
            },
            {
                name: 'Search',
                action: (data: any) => this.search(data)
            }
        ];
    }

    applyToElements(fn: (elem: DrawableElement) => void) {
        let current = this.head;
        while (current) {
            fn(current);
            current = current.next;
        }
    }

    setHightlight(bool: boolean, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        this.applyToElements((elem) => elem.setHightlight(bool, ctx, offsetX, offsetY));
        return this;
    }
}

export class Queue extends List {
    public readonly type: StructureType = StructureType.QUEUE;
    last: Node | null = null;

    constructor() {
        super();
    }

    static ofLength(length: number): Queue {
        const queue = new Queue();
        for (let i = 0; i < length; i++) {
            queue.insert(i);
        }
        return queue;
    }

    insert(data: any) {
        if (this.head === null || this.last == null) {
            this.head = this.last = new Node(data, null);
            return;
        }

        this.last.next = new Node(data, null);
        this.last = this.last.next;
    }

    remove() {
        if (this.head === null) return null;
        const data = this.head.data;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }
            
        return data;
    }

    getActions(): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (last)',
                action: (data: any) => this.insert(data)
            },
            {
                name: 'Remove (first)',
                action: (data: any) => this.remove()
            },
            {
                name: 'Search',
                action: (data: any) => this.search(data)
            }
        ];
    }
}

export class Stack extends List {
    public readonly type: StructureType = StructureType.STACK;

    constructor() {
        super();
    }

    static ofLength(length: number): Stack {
        const stack = new Stack();
        for (let i = 0; i < length; i++) {
            stack.insert(i);
        }
        return stack
    }

    insert(data: any) {
        this.head = new Node(data, this.head);

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x -= this.size * 1.5;
            } else {
                this.y -= this.size * 1.5;
            }
        }
    }

    remove() {
        if (this.head === null) return null;
        const data = this.head.data;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }

        return data;
    }

    getActions(): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (first)',
                action: (data: any) => this.insert(data)
            },
            {
                name: 'Remove (first)',
                action: (data: any) => this.remove()
            },
            {
                name: 'Search',
                action: (data: any) => this.search(data)
            }
        ];
    }
}

export function createStructure(type: StructureType): Structure | undefined {
    switch (type) {
        case StructureType.LIST:
            return new List().setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return new Queue().setDefaultDrawAttributes();
        case StructureType.STACK:
            return new Stack().setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

export function createDefaultStructure(type: StructureType): Structure | undefined {
    switch (type) {
        case StructureType.LIST:
            return List.ofLength(3).setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return Queue.ofLength(3).setDefaultDrawAttributes();
        case StructureType.STACK:
            return Stack.ofLength(3).setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

// https://stackoverflow.com/a/6333775
function canvasArrow(context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) {
    context.beginPath();
    var headlen = 10; // length of head in pixels
    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    context.stroke();
}