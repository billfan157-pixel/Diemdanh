import{i as u,a as f,b as o}from"./iframe-CT42YBi6.js";import{e as g}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const a=class a extends u{constructor(){super(),this.small=!1,this.secondary=!1,this.label=""}render(){return o`
      <button
        class=${g({small:this.small,secondary:this.secondary})}
        @click=${()=>this.dispatchEvent(new CustomEvent("gl-fab-click",{bubbles:!0,composed:!0}))}
        aria-label=${this.label||"Thêm"}
      >
        <slot>+</slot>
      </button>
    `}};a.styles=f`
    :host {
      position: fixed;
      bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
      right: var(--space-6);
      z-index: var(--z-fab, 800);
    }
    button {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full);
      border: none;
      background: var(--color-primary);
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--duration-fast), box-shadow var(--duration-fast);
      -webkit-tap-highlight-color: transparent;
    }
    button:hover {
      transform: scale(1.08);
      box-shadow: var(--shadow-xl);
    }
    button:active {
      transform: scale(0.95);
    }
    button.small {
      width: 44px;
      height: 44px;
      font-size: 1.2rem;
    }
    button.secondary {
      background: var(--color-bg-elevated);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    @media (max-width: 767px) {
      :host {
        bottom: calc(var(--space-4) + 64px + env(safe-area-inset-bottom, 0px));
        right: var(--space-4);
      }
      button {
        width: 48px;
        height: 48px;
        font-size: 1.3rem;
      }
    }
  `,a.properties={small:{type:Boolean},secondary:{type:Boolean},label:{type:String}};let s=a;customElements.define("gl-fab",s);const S={title:"FAB",component:"gl-fab"},e={render:()=>o`<gl-fab></gl-fab>`},r={render:()=>o`<gl-fab small></gl-fab>`},t={render:()=>o`<gl-fab label="Thêm học viên">✏️</gl-fab>`};var l,n,c;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:"{\n  render: () => html`<gl-fab></gl-fab>`\n}",...(c=(n=e.parameters)==null?void 0:n.docs)==null?void 0:c.source}}};var i,m,d;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:"{\n  render: () => html`<gl-fab small></gl-fab>`\n}",...(d=(m=r.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};var p,b,h;t.parameters={...t.parameters,docs:{...(p=t.parameters)==null?void 0:p.docs,source:{originalSource:'{\n  render: () => html`<gl-fab label="Thêm học viên">✏️</gl-fab>`\n}',...(h=(b=t.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};const k=["Default","Small","CustomIcon"];export{t as CustomIcon,e as Default,r as Small,k as __namedExportsOrder,S as default};
