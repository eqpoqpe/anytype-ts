import { observable, action, computed, set, makeObservable } from 'mobx';
import { I, M, Util, Storage, Mark } from 'ts/lib';
import { detailStore } from 'ts/store';

const $ = require('jquery');
const Constant = require('json/constant.json');

class BlockStore {

    public rootId: string = '';
    public profileId: string = '';
    public breadcrumbsId: string = '';
    public recentId: string = '';
    public storeIdType: string = '';
    public storeIdTemplate: string = '';
    public storeIdRelation: string = '';

    public treeMap: Map<string, Map<string, I.BlockStructure>> = new Map();
    public blockMap: Map<string, I.Block[]> = new Map();
    public restrictionMap: Map<string, Map<string, any>> = new Map();

    constructor() {
        makeObservable(this, {
            rootId: observable,
            profileId: observable,
            breadcrumbsId: observable,
            recentId: observable,
            storeIdType: observable,
            storeIdTemplate: observable,
            storeIdRelation: observable,
            root: computed,
            profile: computed,
            breadcrumbs: computed,
            recent: computed,
            storeType: computed,
            storeTemplate: computed,
            storeRelation: computed,
            rootSet: action,
            profileSet: action,
            storeSetType: action,
            storeSetTemplate: action,
            storeSetRelation: action,
            breadcrumbsSet: action,
            recentSet: action,
            set: action,
            clear: action,
            clearAll: action,
            add: action,
            update: action,
            updateStructure: action,
            delete: action
        });
    }

    get root (): string {
		return this.rootId;
	};

    get profile (): string {
		return this.profileId;
	};

    get breadcrumbs (): string {
		return this.breadcrumbsId;
	};

    get recent (): string {
		return this.recentId;
	};

    get storeType (): string {
		return this.storeIdType;
	};

    get storeTemplate (): string {
		return this.storeIdTemplate;
	};

    get storeRelation (): string {
		return this.storeIdRelation;
	};

    rootSet (id: string) {
		this.rootId = String(id || '');
	};

	profileSet (id: string) {
		this.profileId = String(id || '');
	};

    storeSetType (id: string) {
		this.storeIdType = String(id || '');
	};

    storeSetTemplate (id: string) {
		this.storeIdTemplate = String(id || '');
	};

    storeSetRelation (id: string) {
		this.storeIdRelation = String(id || '');
	};

    breadcrumbsSet (id: string) {
		this.breadcrumbsId = String(id || '');
	};

    recentSet (id: string) {
		this.recentId = String(id || '');
	};
	
    set (rootId: string, blocks: I.Block[]) {
		this.blockMap.set(rootId, blocks);
	};

    add (rootId: string, block: I.Block) {
		let blocks = this.getBlocks(rootId);
		blocks.push(block);
	};

    update (rootId: string, param: any) {
		let block = this.getLeaf(rootId, param.id);
		if (!block) {
			return;
		};
		set(block, param);
	};

	clear (rootId: string) {
		this.blockMap.delete(rootId);
		this.treeMap.delete(rootId);
	};

    clearAll () {
		this.blockMap = new Map();
		this.treeMap = new Map();
		this.restrictionMap = new Map();
	};

	setStructure (rootId: string, blocks: any[]) {
		this.treeMap.set(rootId, this.getStructure(blocks));
	};

    updateStructure (rootId: string, blockId: string, childrenIds: string[]) {
		let map = this.getMap(rootId);
		let element = this.getMapElement(rootId, blockId);

		if (!element) {
			element = new M.BlockStructure({ parentId: '', childrenIds: childrenIds });
		} else {
			set(element, 'childrenIds', childrenIds);
		};

		map.set(blockId, element);

		// Update parentId
		for (let [ id, item ] of map.entries()) {
			(item.childrenIds || []).map((it: string) => {
				const check = map.get(it);
				if (check && (check.parentId != id)) {
					check.parentId = id;
					map.set(it, check);
				};
			});
		};
	};

    delete (rootId: string, blockId: string) {
		let blocks = this.getBlocks(rootId);
		let map = this.getMap(rootId);

		this.blockMap.set(rootId, blocks.filter((it: any) => { return it.id != blockId; }));
		map.delete(blockId);
	};

    restrictionsSet (rootId: string, restrictions: any) {
		let map = this.restrictionMap.get(rootId);

		if (!map) {
			map = new Map();
		};

		map.set(rootId, restrictions.object);

		for (let item of restrictions.dataview) {
			map.set(item.blockId, item.restrictions);
		};

		this.restrictionMap.set(rootId, map);
	};

    getMap (rootId: string) {
		return this.treeMap.get(rootId) || new Map();
	};

    getMapElement (rootId: string, blockId: string) {
		const map = this.getMap(rootId);
		return map.get(blockId);
	};

    getLeaf (rootId: string, id: string): any {
		let blocks = this.getBlocks(rootId);
		return blocks.find((it: any) => { return it.id == id; });
	};

    getBlocks (rootId: string, filter?: (it: any) => boolean) {
		let blocks = this.blockMap.get(rootId) || [];

		if (!filter) {
			return blocks;
		};

		return blocks.filter((it: any) => {
			if (filter) {
				return filter(it);
			};
			return true;
		});
	};

    getChildrenIds (rootId: string, blockId: string): string[] {
		const element = this.getMapElement(rootId, blockId);
		return element ? (element.childrenIds || []) : [];
	};

    getChildren (rootId: string, id: string, filter?: (it: any) => boolean) {
		let blocks = this.getBlocks(rootId);
		let childrenIds = this.getChildrenIds(rootId, id);
		
		let childBlocks = childrenIds.map((it: string) => {
			return blocks.find((item: any) => { return item.id == it; });
		}).filter((it: any) => {
			if (!it) {
				return false;
			};
			if (filter) {
				return filter(it);
			};
			return true;
		});
		return childBlocks;
	};

    // If check is present - find next block if check passes or continue to next block in "dir" direction, else just return next block;
    getNextBlock (rootId: string, id: string, dir: number, check?: (item: I.Block) => any, list?: any): any {
		if (!list) {
			list = this.unwrapTree([ this.wrapTree(rootId) ]);
		};

		let idx = list.findIndex((item: I.Block) => { return item.id == id; });
		if (idx + dir < 0 || idx + dir > list.length - 1) {
			return null;
		};

		let ret = list[idx + dir];
		if (check && ret) {
			return check(ret) ? ret : this.getNextBlock(rootId, ret.id, dir, check, list);
		} else {
			return ret;
		};
	};

    getFirstBlock (rootId: string, dir: number, check: (item: I.Block) => any): I.Block {
		const list = this.unwrapTree([ this.wrapTree(rootId) ]).filter(check);
		return dir > 0 ? list[0] : list[list.length - 1];
	};

    getHighestParent (rootId: string, blockId: string): I.Block {
		const block = blockStore.getLeaf(rootId, blockId);
		const parent = blockStore.getLeaf(rootId, block.parentId);

		if (parent.isPage() || parent.isLayoutDiv()) {
			return block;
		} else {
			return this.getHighestParent(rootId, parent.id);
		};
	};

    setNumbers (rootId: string) {
		const container = $('#editor-' + rootId);
		if (!container.length) {
			return;
		};

		const root = this.wrapTree(rootId);
		if (!root) {
			return;
		};

		const unwrap = (list: any) => {
			list = list || [];

			let ret = [] as any[];
			for (let item of list) {
				for (let i = 0; i < item.childBlocks.length; i++) {
					let child = item.childBlocks[i];
					if (child.isLayoutDiv()) {
						item.childBlocks.splice(i, 1);
						i--;
						item.childBlocks = item.childBlocks.concat(unwrap(child.childBlocks));
					};
				};

				ret.push(item);
			};
			return ret;
		};

		const cb = (list: any[]) => {
			list = list || [];

			let n = 0;
			for (let item of list) {
				if (!item.isLayout()) {
					if (item.isTextNumbered()) {
						n++;
						$(`#marker-${item.id}`).text(`${n}.`);
					} else {
						n = 0;
					};
				};

				cb(item.childBlocks);
			};
		};

		cb(unwrap([ root ]));
	};

    getStructure (list: I.Block[]) {
		let map: Map<string, I.BlockStructure> = new Map();

		list = Util.objectCopy(list || []);
		list.map((item: any) => {
			map.set(item.id, {
				parentId: '',
				childrenIds: item.childrenIds || [],
			});
		});

		for (let [ id, item ] of map.entries()) {
			(item.childrenIds || []).map((it: string) => {
				const check = map.get(it);
				if (check && (check.parentId != id)) {
					check.parentId = id;
					map.set(it, check);
				};
			});
		};

		for (let [ id, item ] of map.entries()) {
			map.set(id, new M.BlockStructure(item));
		};

		return map;
	};

    getTree (rootId: string, list: I.Block[]): I.Block[] {
		list = Util.objectCopy(list || []);

		let map: any = {};

		for (let item of list) {
			map[item.id] = item;
		};

		for (let item of list) {
			map[item.id].childrenIds = this.getChildrenIds(rootId, item.id);
			map[item.id].childBlocks = this.getChildren(rootId, item.id);
		};

		return (map[rootId] || {}).childBlocks || [];
	};

    wrapTree (rootId: string) {
		let map = this.getMap(rootId);
		let ret: any = {};

		for (let [ id, item ] of map.entries()) {
			ret[id] = this.getLeaf(rootId, id);
			if (ret[id]) {
				ret[id].parentId = String(item.parentId || '');
				ret[id].childBlocks = this.getChildren(rootId, id);
			};
		};

		return ret[rootId];
	};

    unwrapTree (tree: any[]): any[] {
		tree = tree || [];

		let ret = [] as I.Block[];
		for (let item of tree) {
			if (!item) {
				continue;
			};

			let cb = item.childBlocks;

			if (cb) {
				try { delete(item.childBlocks); } catch (e) {};
			};
			
			ret.push(item);
			
			if (cb && cb.length) {
				ret = ret.concat(this.unwrapTree(cb));
			};
		};
		return ret;
	};

    getRestrictions (rootId: string, blockId: string) {
		const map = this.restrictionMap.get(rootId);
		if (!map) {
			return [];
		};

		return map.get(blockId) || [];
	};

    isAllowed (rootId: string, blockId: string, flags: any[]): boolean {
		if (!rootId || !blockId) {
			return false;
		};

		const restrictions = this.getRestrictions(rootId, blockId);
		for (let flag of flags) {
			if (restrictions.indexOf(flag) >= 0) {
				return false;
			};
		};
		return true;
	};

    toggle (rootId: string, blockId: string, v: boolean) {
		const element = $(`#block-${blockId}`);

		v ? element.addClass('isToggled') : element.removeClass('isToggled');
		Storage.setToggle(rootId, blockId, v);
		
		$(window).trigger('resize.editor');
		element.find('.resizable').trigger('resize', [ $.Event('resize') ]);
	};

	updateMarkup (rootId: string) {
		let blocks = Util.objectCopy(this.getBlocks(rootId, (it: I.Block) => { return it.isText(); }));
		for (let block of blocks) {
			let text = block.content.text;
			let marks = block.content.marks || [];

			if (!marks.length) {
				continue;
			};

			marks.sort(Mark.sort);

			for (let n = 0; n < marks.length; ++n) {
				let mark = marks[n];
				if ((mark.type != I.MarkType.Mention) || !mark.param) {
					continue;
				};

				const { from, to } = mark.range;
				const object = detailStore.get(rootId, mark.param, [ Constant.relationKey.name ], true);
				const old = text.substr(from, to - from);

				if (old != object.name) {
					const d = String(old || '').length - String(object.name || '').length;

					text = Util.stringInsert(text, object.name, mark.range.from, mark.range.to);

					if (d != 0) {
						mark.range.to -= d;

						for (let i = 0; i < marks.length; ++i) {
							let m = marks[i];
							if ((n == i) || (m.range.to <= from)) {
								continue;
							};
							if (m.range.from >= to) {
								marks[i].range.from -= d;
							};
							marks[i].range.to -= d;
						};
					};
				};
			};

			this.update(rootId, { id: block.id, content: { ...block.content, text: text, marks: marks } });
		};
	};

	checkDraft (rootId: string) {
		const object = detailStore.get(rootId, rootId, [ 'isDraft' ], true);
		const footer = this.getMapElement(rootId, Constant.blockId.footer);
		if (!footer) {
			return;
		};

		let change = false;
		if (object.isDraft) {
			if (footer.childrenIds.indexOf(Constant.blockId.type) < 0) {
				footer.childrenIds.push(Constant.blockId.type);
				change = true;
			};
		} else {
			footer.childrenIds = footer.childrenIds.filter((it: string) => { return it != Constant.blockId.type; });
			change = true;
		};
		
		if (change) {
			this.updateStructure(rootId, Constant.blockId.footer, footer.childrenIds);
		};
	};

};

export let blockStore: BlockStore = new BlockStore();
