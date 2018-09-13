import ElementEmpty from './element-empty';
import RootEmpty from './root-empty';

export default class extends Marionette.CompositeView {
	getTemplate() {
		return '#tmpl-elementor-navigator__elements';
	}

	ui() {
		return {
			item: '> .elementor-navigator__item',
			title: '> .elementor-navigator__item .elementor-navigator__element__title__text',
			toggle: '> .elementor-navigator__item > .elementor-navigator__element__toggle',
			toggleList: '> .elementor-navigator__item > .elementor-navigator__element__list-toggle',
			elements: '> .elementor-navigator__elements',
		};
	}

	events() {
		return {
			contextmenu: 'onContextMenu',
			'click @ui.item': 'onItemClick',
			'click @ui.toggle': 'onToggleClick',
			'click @ui.toggleList': 'onToggleListClick',
			'dblclick @ui.title': 'onTitleDoubleClick',
			'keydown @ui.title': 'onTitleKeyDown',
			'paste @ui.title': 'onTitlePaste',
			'sortstart @ui.elements': 'onSortStart',
			'sortover @ui.elements': 'onSortOver',
			'sortout @ui.elements': 'onSortOut',
			'sortstop @ui.elements': 'onSortStop',
			'sortupdate @ui.elements': 'onSortUpdate',
			'sortreceive @ui.elements': 'onSortReceive',
		};
	}

	getEmptyView() {
		if ( this.isRoot() ) {
			return RootEmpty;
		}

		if ( this.hasChildren() ) {
			return ElementEmpty;
		}

		return null;
	}

	childViewOptions() {
		return {
			indent: this.getIndent() + 10,
		};
	}

	className() {
		const elType = this.model.get( 'elType' );

		let classes = 'elementor-navigator__element';

		if ( elType ) {
			classes += ' elementor-navigator__element-' + elType;
		}

		if ( this.hasChildren() ) {
			classes += ' elementor-navigator__element--has-children';
		}

		return classes;
	}

	attributes() {
		return {
			'data-model-cid': this.model.cid,
		};
	}

	templateHelpers() {
		const helpers = {};

		if ( ! this.isRoot() ) {
			helpers.title = this.model.getTitle();

			helpers.icon = 'section' === this.model.get( 'elType' ) ? '' : this.model.getIcon();
		}

		return helpers;
	}

	initialize() {
		this.collection = this.model.get( 'elements' );

		this.childViewContainer = '.elementor-navigator__elements';

		this.listenTo( this.model, 'request:edit', this.onEditRequest )
            .listenTo( this.model, 'change', this.onModelChange )
			.listenTo( this.model.get( 'settings' ), 'change', this.onModelSettingsChange );
	}

	getIndent() {
		return this.getOption( 'indent' ) || 0;
	}

	isRoot() {
		return ! this.model.get( 'elType' );
	}

	hasChildren() {
		return 'widget' !== this.model.get( 'elType' );
	}

	toggleList( state, callback ) {
		if ( ! this.hasChildren() || this.isRoot() ) {
			return;
		}

		const isActive = this.ui.item.hasClass( 'elementor-active' );

		if ( isActive === state ) {
			return;
		}

		this.ui.item.toggleClass( 'elementor-active', state );

		let slideMethod = 'slideToggle';

		if ( undefined !== state ) {
			slideMethod = 'slide' + ( state ? 'Down' : 'Up' );
		}

		this.ui.elements[ slideMethod ]( 300, callback );
	}

	toggleHiddenClass() {
		this.$el.toggleClass( 'elementor-navigator__element--hidden', !! this.model.get( 'hidden' ) );
	}

	recursiveChildInvoke( method, ...restArgs ) {
		this[ method ].apply( this, restArgs );

		this.children.each( ( child ) => {
			if ( ! ( child instanceof this.constructor ) ) {
				return;
			}

			child.recursiveChildInvoke.apply( child, arguments );
		} );
	}

	recursiveParentInvoke( method, ...restArgs ) {
		if ( ! ( this._parent instanceof this.constructor ) ) {
			return;
		}

		this._parent[ method ].apply( this._parent, restArgs );

		this._parent.recursiveParentInvoke.apply( this._parent, arguments );
	}

	recursiveChildAgreement( method, ...restArgs ) {
		if ( ! this[ method ].apply( this, restArgs ) ) {
			return false;
		}

		let hasAgreement = true;

		for ( const child of Object.values( this.children._views ) ) {
			if ( ! ( child instanceof this.constructor ) ) {
				continue;
			}

			if ( ! child.recursiveChildAgreement.apply( child, arguments ) ) {
				hasAgreement = false;

				break;
			}
		}

		return hasAgreement;
	}

	activateMouseInteraction() {
		this.$el.on( {
			mouseenter: this.onMouseEnter.bind( this ),
			mouseleave: this.onMouseLeave.bind( this ),
		} );
	}

	deactivateMouseInteraction() {
		this.$el.off( 'mouseenter mouseleave' );
	}

	dragShouldBeIgnored( draggedModel ) {
		const childTypes = elementor.helpers.getElementChildType( this.model.get( 'elType' ) ),
			draggedElType = draggedModel.get( 'elType' );

		if ( 'section' === draggedElType && ! draggedModel.get( 'isInner' ) ) {
			return true;
		}

		return ! childTypes || -1 === childTypes.indexOf( draggedModel.get( 'elType' ) );
	}

	addEditingClass() {
		this.ui.item.addClass( 'elementor-editing' );
	}

	removeEditingClass() {
		this.ui.item.removeClass( 'elementor-editing' );
	}

	enterTitleEditing() {
		this.ui.title.attr( 'contenteditable', true ).focus();

		document.execCommand( 'selectAll' );

		elementor.addBackgroundClickListener( 'navigator', {
			ignore: this.ui.title,
			callback: this.exitTitleEditing.bind( this ),
		} );
	}

	exitTitleEditing() {
		this.ui.title.attr( 'contenteditable', false );

		const newTitle = this.ui.title.text().trim();

		this.model.get( 'settings' ).set( '_title', newTitle );

		elementor.removeBackgroundClickListener( 'navigator' );
	}

	activateSortable() {
		if ( ! elementor.userCan( 'design' ) ) {
			return;
		}

		this.ui.elements.sortable( {
			items: '> .elementor-navigator__element',
			placeholder: 'ui-sortable-placeholder',
			axis: 'y',
			forcePlaceholderSize: true,
			connectWith: '.elementor-navigator__element-' + this.model.get( 'elType' ) + ' ' + this.ui.elements.selector,
			cancel: '[contenteditable="true"]',
		} );
	}

	onRender() {
		this.activateSortable();

		this.ui.item.css( 'padding-' + ( elementor.config.is_rtl ? 'right' : 'left' ), this.getIndent() );

		this.toggleHiddenClass();
	}

	onModelChange() {
		if ( undefined !== this.model.changed.hidden ) {
			this.toggleHiddenClass();
		}
	}

	onModelSettingsChange( settingsModel ) {
		if ( undefined !== settingsModel.changed._title ) {
			this.ui.title.text( this.model.getTitle() );
		}
	}

	onItemClick() {
		this.model.trigger( 'request:edit', { scrollIntoView: true } );
	}

	onToggleClick( event ) {
		event.stopPropagation();

		this.model.trigger( 'request:toggleVisibility' );
	}

	onTitleDoubleClick() {
		this.enterTitleEditing();
	}

	onTitleKeyDown( event ) {
		const ENTER_KEY = 13;

		if ( ENTER_KEY === event.which ) {
			event.preventDefault();

			this.exitTitleEditing();
		}
	}

	onTitlePaste( event ) {
		event.preventDefault();

		document.execCommand( 'insertHTML', false, event.originalEvent.clipboardData.getData( 'text/plain' ) );
	}

	onToggleListClick( event ) {
		event.stopPropagation();

		this.toggleList();
	}

	onSortStart( event, ui ) {
		this.model.trigger( 'request:sort:start', event, ui );

		jQuery( ui.item ).children( '.elementor-navigator__item' ).trigger( 'click' );

		elementor.navigator.getLayout().activateElementsMouseInteraction();
	}

	onSortStop() {
		elementor.navigator.getLayout().deactivateElementsMouseInteraction();
	}

	onSortOver( event ) {
		event.stopPropagation();

		this.$el.addClass( 'elementor-dragging-on-child' );
	}

	onSortOut( event ) {
		event.stopPropagation();

		this.$el.removeClass( 'elementor-dragging-on-child' );
	}

	onSortUpdate( event, ui ) {
		event.stopPropagation();

		if ( ! this.ui.elements.is( ui.item.parent() ) ) {
			return;
		}

		this.model.trigger( 'request:sort:update', ui );
	}

	onSortReceive( event, ui ) {
		this.model.trigger( 'request:sort:receive', event, ui );
	}

	onMouseEnter( event ) {
		event.stopPropagation();

		const dragShouldBeIgnored = this.recursiveChildAgreement( 'dragShouldBeIgnored', elementor.channels.data.request( 'dragging:model' ) );

		if ( dragShouldBeIgnored ) {
			return;
		}

		this.autoExpandTimeout = setTimeout( () => {
			this.toggleList( true, () => {
				this.ui.elements.sortable( 'refreshPositions' );
			} );
		}, 500 );
	}

	onMouseLeave( event ) {
		event.stopPropagation();

		clearTimeout( this.autoExpandTimeout );
	}

	onContextMenu( event ) {
		this.model.trigger( 'request:contextmenu', event );
	}

	onEditRequest() {
		this.recursiveParentInvoke( 'toggleList', true );

		elementor.navigator.getLayout().elements.currentView.recursiveChildInvoke( 'removeEditingClass' );

		this.addEditingClass();

		elementor.helpers.scrollToView( this.$el, 400, elementor.navigator.getLayout().elements.$el );
	}
}