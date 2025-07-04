import React, { forwardRef, useRef, useState, useImperativeHandle, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Loader, Frame, Title, Error, Button } from 'Component';
import { I, S, U, J, translate, analytics, sidebar } from 'Lib';

const PageMainMembership = observer(forwardRef<I.PageRef, I.PageComponent>((props, ref) => {

	const nodeRef = useRef(null);
	const { isPopup } = props;
	const [ error, setError ] = useState('');
	const { membership } = S.Auth;
	const { status } = membership;
	const tier = U.Data.getMembershipTier(membership.tier);

	const init = () => {
		const { location } = props;
		const data = U.Common.searchParam(location.search);

		let newTier = data.tier;

		U.Data.getMembershipStatus((membership: I.Membership) => {
			if (!membership || membership.isNone) {
				setError(translate('pageMainMembershipError'));
				return;
			};

			U.Space.openDashboard({
				replace: true,
				animate: true,
				onFadeIn: () => {
					if (data.code) {
						S.Popup.open('membershipActivation', { data });
					} else
					if (newTier && (newTier != I.TierType.None)) {
						if (tier.price) {
							newTier = tier.id;
						};

						S.Popup.open('membership', { data: { tier: newTier } });
					} else {
						finalise();
					};
				},
			});
		});

		resize();
	};

	const finalise = () => {
		S.Popup.closeAll(null, () => {
			U.Data.getMembershipStatus((membership: I.Membership) => {
				const { status, tier } = membership;

				if (status == I.MembershipStatus.Finalization) {
					S.Popup.open('membershipFinalization', { data: { tier } });
				} else {
					S.Popup.open('membership', {
						data: {
							onContinue: () => U.Object.openRoute({ id: 'membership', layout: I.ObjectLayout.Settings }),
							tier: membership.tier,
							success: true,
						},
					});

					analytics.event('ChangePlan', { params: { tier }});
				};
			});
		});
	};

	const resize = () => {
		const win = $(window);
		const node = $(nodeRef.current);
		const obj = U.Common.getPageFlexContainer(isPopup);

		node.css({ height: (isPopup ? obj.height() : win.height()) });
	};

	useEffect(() => init(), []);

	useImperativeHandle(ref, () => ({
		resize,
	}));

	return (
		<div 
			ref={nodeRef}
			className="wrapper"
		>
			<Frame>
				<Title text={error ? translate('commonError') : translate('pageMainMembershipTitle')} />
				<Error text={error} />

				{error ? (
					<div className="buttons">
						<Button 
							text={translate('commonBack')} 
							color="blank" 
							className="c36" 
							onClick={() => U.Space.openDashboard()} 
						/>
					</div>
				) : <Loader />}
			</Frame>
		</div>
	);

}));

export default PageMainMembership;
