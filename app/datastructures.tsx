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
}

export abstract class Structure extends DrawableElement {
    abstract insert(data: any): void;
    abstract remove(data: any): void;
}

export class Node extends DrawableElement {
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
        ctx.fillRect(this.x + offsetX, this.y + offsetY, this.size, this.size);
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
            canvasArrow(ctx, this.x + this.size + offsetX, this.y + this.size / 2 + offsetY, this.next.x + offsetX, this.next.y + this.size / 2 + offsetY);
        }
    }
}

export class List extends DrawableElement {
    head: Node | null = null;

    constructor() {
        super();
    }

    static ofLength(length: number) {
        const list = new List();
        let current = new Node(0);
        list.head = current;
        for (let i = 1; i < length; i++) {
            current.next = new Node(i, null);
            current = current.next;
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
            x += size * 1.5;
            current = current.next;
        }
        return this;
    }

    insert(data: any) {
        if (this.head === null) {
            this.head = new Node(data, null).setDrawAttributes(this.x, this.y, this.size, this.color);
            return;
        }

        let current = this.head;
        let offset = 1;

        while (current.next) {
            current = current.next;
            offset += 1;
        }

        current.next = new Node(data, null);
    }

    remove(data: any) {
        if (this.head === null) return;

        if (this.head.data === data) {
            this.head = this.head.next;
            return;
        }

        let current = this.head;
        while (current.next) {
            if (current.next.data === data) {
                current.next = current.next.next;
                return;
            }
            current = current.next;
        }
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