import * as React from 'react';
import { observer } from 'mobx-react';
import { Block } from 'Component';
import { blockStore, detailStore } from 'Store';
import { I, M, UtilData, translate, UtilCommon } from 'Lib';
import HeadSimple from 'Component/page/elements/head/simple';

interface Props extends I.PageComponent {
	rootId: string;
	onCopy: () => void;
	getWrapperWidth: () => number;
};

const HistoryLeft = observer(class HistoryLeft extends React.Component<Props> {

	node = null;
	refHead = null;
	top = 0;

	constructor (props: Props) {
		super(props);

		this.onScroll = this.onScroll.bind(this);
	};

	render () {
		const { rootId, onCopy } = this.props;
		const root = blockStore.getLeaf(rootId, rootId);

		if (!root) {
			return null;
		};

		const childrenIds = blockStore.getChildrenIds(rootId, rootId);
		const check = UtilData.checkDetails(rootId);
		const object = detailStore.get(rootId, rootId, [ 'layoutAlign' ]);
		const icon = new M.Block({ id: `${rootId}-icon`, type: I.BlockType.IconPage, hAlign: object.layoutAlign, childrenIds: [], fields: {}, content: {} });
		const cover = new M.Block({ id: `${rootId}-cover`, type: I.BlockType.Cover, hAlign: object.layoutAlign, childrenIds: [], fields: {}, content: {} });
		const cn = [ 'editorWrapper', check.className ];
		const isSet = root.isObjectSet();
		const isCollection = root.isObjectCollection();
		const isHuman = root.isObjectHuman();
		const isParticipant = root.isObjectParticipant();

		let head = null;
		let children = blockStore.getChildren(rootId, rootId);

		if (isSet || isCollection) {
			const placeholder = isCollection ? translate('defaultNameCollection') : translate('defaultNameSet');

			head = (
				<HeadSimple 
					{...this.props} 
					ref={ref => this.refHead = ref} 
					placeholder={placeholder} 
					rootId={rootId} 
					readonly={true}
				/>
			);

			children = children.filter(it => it.isDataview());
			check.withIcon = false;
		} else
		if (isHuman || isParticipant) {
			icon.type = I.BlockType.IconUser;
		};

		return (
			<div ref={ref => this.node = ref} id="historySideLeft" onScroll={this.onScroll}>
				<div id="editorWrapper" className={cn.join(' ')}>
					<div className="editor">
						<div className="blocks">
							<div className="editorControls" />

							{head}
							{check.withCover ? <Block {...this.props} rootId={rootId} key={cover.id} block={cover} readonly={true} /> : ''}
							{check.withIcon ? <Block {...this.props} rootId={rootId} key={icon.id} block={icon} readonly={true} /> : ''}
							
							{children.map((block: I.Block, i: number) => (
								<Block 
									key={block.id} 
									{...this.props}
									rootId={rootId}
									index={i}
									block={block}
									readonly={true}
									onCopy={onCopy}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	};
	
	componentDidUpdate () {
		blockStore.updateNumbers(this.props.rootId);
		$(this.node).scrollTop(this.top);
	};

	onScroll () {
		this.top = $(this.node).scrollTop();
		UtilCommon.getScrollContainer(this.props.isPopup).trigger('scroll');
	};

});

export default HistoryLeft;