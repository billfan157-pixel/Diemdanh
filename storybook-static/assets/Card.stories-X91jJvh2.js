import{i as v,a as h,b as o}from"./iframe-CT42YBi6.js";import{e as u}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const t=class t extends v{constructor(){super(),this.clickable=!1,this.padding=""}render(){return o`
      <div class="card ${u({"card-clickable":this.clickable})}" style=${this.padding?`padding:${this.padding}`:""}>
        <slot name="header"></slot>
        <slot></slot>
      </div>
    `}};t.styles=h`
    :host { display: block; }
    .card {
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: var(--space-5);
      box-shadow: var(--shadow-md);
      transition: all var(--duration-normal) var(--easing-standard);
    }
    .card:hover {
      border-color: color-mix(in srgb, var(--color-primary) 30%, var(--glass-border));
      box-shadow: var(--shadow-lg);
    }
    .card-clickable { cursor: pointer; }
    .card-clickable:hover {
      transform: translateY(-3px);
    }
    .card-clickable:active { transform: translateY(-1px) scale(0.99); }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-3);
      gap: var(--space-3);
    }
    .card-title {
      font-family: var(--font-family-display);
      font-size: var(--font-size-lg);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--color-text);
    }
  `,t.properties={clickable:{type:Boolean},padding:{type:String}};let s=t;customElements.define("gl-card",s);const w={title:"Card",component:"gl-card",argTypes:{clickable:{control:"boolean"},padding:{control:"text"}},args:{clickable:!1,padding:""}},r={render:()=>o`
    <gl-card>
      <div>Nội dung thẻ</div>
    </gl-card>
  `},a={render:()=>o`
    <gl-card>
      <div slot="header">
        <h3 style="margin:0;">Tiêu đề</h3>
        <gl-badge color="primary">Mới</gl-badge>
      </div>
      <p style="margin:0;color:var(--color-text-secondary);">Nội dung mô tả bên trong thẻ.</p>
    </gl-card>
  `},e={render:()=>o`
    <gl-card clickable>
      <div>Bấm vào thẻ này</div>
    </gl-card>
  `};var l,d,c;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => html\`
    <gl-card>
      <div>Nội dung thẻ</div>
    </gl-card>
  \`
}`,...(c=(d=r.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};var i,n,g;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => html\`
    <gl-card>
      <div slot="header">
        <h3 style="margin:0;">Tiêu đề</h3>
        <gl-badge color="primary">Mới</gl-badge>
      </div>
      <p style="margin:0;color:var(--color-text-secondary);">Nội dung mô tả bên trong thẻ.</p>
    </gl-card>
  \`
}`,...(g=(n=a.parameters)==null?void 0:n.docs)==null?void 0:g.source}}};var p,m,b;e.parameters={...e.parameters,docs:{...(p=e.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => html\`
    <gl-card clickable>
      <div>Bấm vào thẻ này</div>
    </gl-card>
  \`
}`,...(b=(m=e.parameters)==null?void 0:m.docs)==null?void 0:b.source}}};const N=["Default","WithHeader","Clickable"];export{e as Clickable,r as Default,a as WithHeader,N as __namedExportsOrder,w as default};
