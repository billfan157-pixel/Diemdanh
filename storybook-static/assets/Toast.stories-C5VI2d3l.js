import{i as T,a as C,b as t}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const n=class n extends T{constructor(){super(),this._hideTimer=null,this._hiding=!1,this.type="info",this.message="",this.closable=!0,this.duration=4e3}connectedCallback(){super.connectedCallback(),this.duration>0&&(this._hideTimer=setTimeout(()=>this.hide(),this.duration))}disconnectedCallback(){super.disconnectedCallback(),this._hideTimer&&clearTimeout(this._hideTimer)}hide(){if(this._hiding)return;this._hiding=!0,this.shadowRoot.querySelector(".toast").classList.add("hiding"),setTimeout(()=>{this.dispatchEvent(new CustomEvent("gl-toast-end",{bubbles:!0,composed:!0})),this.remove()},200)}render(){const c={info:"ℹ️",success:"✅",warning:"⚠️",error:"❌"};return t`
      <div class="toast toast-${this.type}">
        <span>${c[this.type]}</span>
        <span>${this.message}</span>
        ${this.closable?t`<button class="toast-close" @click=${this.hide} aria-label="Đóng">×</button>`:""}
      </div>
    `}};n.styles=C`
    :host {
      display: block;
      position: fixed;
      bottom: var(--space-4);
      right: var(--space-4);
      z-index: var(--z-toast);
      max-width: 360px;
      animation: toast-in var(--duration-normal) var(--easing-standard);
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      color: white;
    }
    .toast-info { background: var(--color-primary); }
    .toast-success { background: var(--color-success); }
    .toast-warning { background: var(--color-warning); }
    .toast-error { background: var(--color-danger); }
    .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 1rem;
      opacity: 0.8;
    }
    .toast-close:hover { opacity: 1; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes toast-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(100%); }
    }
    .hiding { animation: toast-out var(--duration-fast) forwards; }
  `,n.properties={type:{type:String},message:{type:String},closable:{type:Boolean},duration:{type:Number}};let i=n;customElements.define("gl-toast",i);const $={title:"Toast",component:"gl-toast",argTypes:{type:{control:"select",options:["info","success","warning","error"]},message:{control:"text"},closable:{control:"boolean"},duration:{control:"number"}},args:{type:"info",message:"Đây là thông báo",closable:!0,duration:4e3}},e={render:()=>t`<gl-toast type="info" message="Thông tin đã được lưu."></gl-toast>`},s={render:()=>t`<gl-toast type="success" message="Đồng bộ thành công!"></gl-toast>`},a={render:()=>t`<gl-toast type="warning" message="Sắp đến hạn tổng kết."></gl-toast>`},r={render:()=>t`<gl-toast type="error" message="Có lỗi xảy ra khi lưu."></gl-toast>`},o={render:()=>t`<gl-toast type="success" message="Tự động ẩn sau 3s" closable=false duration=3000></gl-toast>`};var l,d,g;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:'{\n  render: () => html`<gl-toast type="info" message="Thông tin đã được lưu."></gl-toast>`\n}',...(g=(d=e.parameters)==null?void 0:d.docs)==null?void 0:g.source}}};var p,m,u;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:'{\n  render: () => html`<gl-toast type="success" message="Đồng bộ thành công!"></gl-toast>`\n}',...(u=(m=s.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var h,y,b;a.parameters={...a.parameters,docs:{...(h=a.parameters)==null?void 0:h.docs,source:{originalSource:'{\n  render: () => html`<gl-toast type="warning" message="Sắp đến hạn tổng kết."></gl-toast>`\n}',...(b=(y=a.parameters)==null?void 0:y.docs)==null?void 0:b.source}}};var f,v,k;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:'{\n  render: () => html`<gl-toast type="error" message="Có lỗi xảy ra khi lưu."></gl-toast>`\n}',...(k=(v=r.parameters)==null?void 0:v.docs)==null?void 0:k.source}}};var w,x,S;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:'{\n  render: () => html`<gl-toast type="success" message="Tự động ẩn sau 3s" closable=false duration=3000></gl-toast>`\n}',...(S=(x=o.parameters)==null?void 0:x.docs)==null?void 0:S.source}}};const z=["Info","Success","Warning","Error","NonClosable"];export{r as Error,e as Info,o as NonClosable,s as Success,a as Warning,z as __namedExportsOrder,$ as default};
