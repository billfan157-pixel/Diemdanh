import{i as m,a as u,b as r}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const e=class e extends m{constructor(){super(),this.text="",this.position="top"}render(){return r`
      <span class="trigger" tabindex="0" aria-describedby="tooltip">
        <slot></slot>
      </span>
      <span class="tooltip tooltip-${this.position}" id="tooltip" role="tooltip">${this.text}</span>
    `}};e.styles=u`
    :host {
      display: inline-flex;
      position: relative;
    }
    .trigger { cursor: pointer; }
    .tooltip {
      position: absolute;
      padding: var(--space-1) var(--space-2);
      background: var(--color-text);
      color: var(--color-bg);
      font-size: var(--font-size-xs);
      font-weight: 600;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      pointer-events: none;
      z-index: var(--z-tooltip, 900);
      opacity: 0;
      transition: opacity var(--duration-fast);
    }
    :host(:hover) .tooltip,
    :host(:focus-within) .tooltip { opacity: 1; }
    .tooltip-top { bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .tooltip-bottom { top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
    .tooltip-left { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
    .tooltip-right { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }

    .tooltip::after {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 4px solid transparent;
    }
    .tooltip-top::after { top: 100%; left: 50%; margin-left: -4px; border-top-color: var(--color-text); }
    .tooltip-bottom::after { bottom: 100%; left: 50%; margin-left: -4px; border-bottom-color: var(--color-text); }
    .tooltip-left::after { left: 100%; top: 50%; margin-top: -4px; border-left-color: var(--color-text); }
    .tooltip-right::after { right: 100%; top: 50%; margin-top: -4px; border-right-color: var(--color-text); }

    @media (hover: none) {
      .tooltip { display: none; }
    }
  `,e.properties={text:{type:String},position:{type:String}};let p=e;customElements.define("gl-tooltip",p);const v={title:"Tooltip",component:"gl-tooltip",argTypes:{text:{control:"text"},position:{control:"select",options:["top","bottom","left","right"]}},args:{text:"Đây là tooltip",position:"top"}},t={render:()=>r`<gl-tooltip text="Tooltip trên" position="top"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`},o={render:()=>r`<gl-tooltip text="Tooltip dưới" position="bottom"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`},i={render:()=>r`
    <div style="display:flex;gap:24px;padding:40px;">
      <gl-tooltip text="Trên" position="top"><button>Top</button></gl-tooltip>
      <gl-tooltip text="Dưới" position="bottom"><button>Bottom</button></gl-tooltip>
      <gl-tooltip text="Trái" position="left"><button>Left</button></gl-tooltip>
      <gl-tooltip text="Phải" position="right"><button>Right</button></gl-tooltip>
    </div>
  `};var l,n,s;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:'{\n  render: () => html`<gl-tooltip text="Tooltip trên" position="top"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`\n}',...(s=(n=t.parameters)==null?void 0:n.docs)==null?void 0:s.source}}};var a,c,g;o.parameters={...o.parameters,docs:{...(a=o.parameters)==null?void 0:a.docs,source:{originalSource:'{\n  render: () => html`<gl-tooltip text="Tooltip dưới" position="bottom"><button style="padding:8px 16px;">Hover</button></gl-tooltip>`\n}',...(g=(c=o.parameters)==null?void 0:c.docs)==null?void 0:g.source}}};var d,x,b;i.parameters={...i.parameters,docs:{...(d=i.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => html\`
    <div style="display:flex;gap:24px;padding:40px;">
      <gl-tooltip text="Trên" position="top"><button>Top</button></gl-tooltip>
      <gl-tooltip text="Dưới" position="bottom"><button>Bottom</button></gl-tooltip>
      <gl-tooltip text="Trái" position="left"><button>Left</button></gl-tooltip>
      <gl-tooltip text="Phải" position="right"><button>Right</button></gl-tooltip>
    </div>
  \`
}`,...(b=(x=i.parameters)==null?void 0:x.docs)==null?void 0:b.source}}};const y=["Top","Bottom","AllPositions"];export{i as AllPositions,o as Bottom,t as Top,y as __namedExportsOrder,v as default};
