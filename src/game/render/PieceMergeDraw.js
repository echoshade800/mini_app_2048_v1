import { Animated, Easing } from 'react-native';
import PieceDraw from './PieceDraw';
import Piece from '../Piece';

export default class PieceMergeDraw {
  // animationData: { fromA:{r,c}, fromB:{r,c}, to:{r,c}, pre:{r,c} }
  constructor(sourcePieceA, sourcePieceB, targetValue, animationData, layout, duration = 180) {
    this.a = sourcePieceA; // Piece
    this.b = sourcePieceB; // Piece
    this.target = new Piece(targetValue);
    this.data = animationData;
    this.layout = layout;
    this.duration = duration;

    // 旧幽灵：A/B 从 from → pre，且在中点后淡出
    this.trA = new Animated.ValueXY({ 
      x: layout.toX(this.data.fromA.c), 
      y: layout.toY(this.data.fromA.r) 
    });
    this.trB = new Animated.ValueXY({ 
      x: layout.toX(this.data.fromB.c), 
      y: layout.toY(this.data.fromB.r) 
    });
    this.opA = new Animated.Value(1);
    this.opB = new Animated.Value(1);

    // 新幽灵：从 pre → to，25%~40% 淡入，90% 放大回弹
    this.trNew = new Animated.ValueXY({ 
      x: layout.toX(this.data.pre.c), 
      y: layout.toY(this.data.pre.r) 
    });
    this.opNew = new Animated.Value(0);
    this.scaleNew = new Animated.Value(1);

    this.drawBase = new PieceDraw(this.target); // 复用静态渲染
    this.drawA = new PieceDraw(this.a);
    this.drawB = new PieceDraw(this.b);

    this.running = false;
  }

  play(onAlmostEnd, onEnd) {
    if (this.running) return;
    this.running = true;

    const half = this.duration * 0.5;

    // A/B: 位移到 pre，同时在 ~50% 淡出
    const moveA = Animated.timing(this.trA, {
      toValue: { 
        x: this.layout.toX(this.data.pre.c), 
        y: this.layout.toY(this.data.pre.r) 
      },
      duration: half,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    
    const moveB = Animated.timing(this.trB, {
      toValue: { 
        x: this.layout.toX(this.data.pre.c), 
        y: this.layout.toY(this.data.pre.r) 
      },
      duration: half,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    
    const fadeA = Animated.timing(this.opA, { 
      toValue: 0, 
      duration: 20, 
      delay: half - 20, 
      useNativeDriver: true 
    });
    
    const fadeB = Animated.timing(this.opB, { 
      toValue: 0, 
      duration: 20, 
      delay: half - 20, 
      useNativeDriver: true 
    });

    // 新幽灵：淡入 + 位移到 to
    const fadeInNew = Animated.timing(this.opNew, { 
      toValue: 1, 
      duration: 60, 
      delay: half * 0.5, 
      useNativeDriver: true 
    });
    
    const moveNew = Animated.timing(this.trNew, {
      toValue: { 
        x: this.layout.toX(this.data.to.c), 
        y: this.layout.toY(this.data.to.r) 
      },
      duration: this.duration - half,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // 抵达前的放大回弹（在最后 30~40ms）
    const bounceUp = Animated.timing(this.scaleNew, { 
      toValue: 1.12, 
      duration: 50, 
      delay: this.duration - 90, 
      useNativeDriver: true 
    });
    
    const bounceBack = Animated.timing(this.scaleNew, { 
      toValue: 1, 
      duration: 50, 
      useNativeDriver: true 
    });

    // 在90%时机触发"即将完成"回调
    setTimeout(() => {
      onAlmostEnd && onAlmostEnd();
    }, this.duration * 0.9);

    Animated.parallel([
      moveA, 
      moveB, 
      fadeA, 
      fadeB, 
      fadeInNew, 
      moveNew, 
      Animated.sequence([bounceUp, bounceBack])
    ]).start(() => {
      this.running = false;
      onEnd && onEnd();
    });
  }

  render() {
    // 旧幽灵 A/B
    const elA = this.drawA.render({
      row: this.data.fromA.r, 
      col: this.data.fromA.c, 
      layout: this.layout,
      anim: { 
        translateX: this.trA.x, 
        translateY: this.trA.y, 
        opacity: this.opA, 
        scale: new Animated.Value(1) 
      }
    });
    
    const elB = this.drawB.render({
      row: this.data.fromB.r, 
      col: this.data.fromB.c, 
      layout: this.layout,
      anim: { 
        translateX: this.trB.x, 
        translateY: this.trB.y, 
        opacity: this.opB, 
        scale: new Animated.Value(1) 
      }
    });

    // 新幽灵（合并结果）
    const elNew = this.drawBase.render({
      row: this.data.pre.r, 
      col: this.data.pre.c, 
      layout: this.layout,
      anim: { 
        translateX: this.trNew.x, 
        translateY: this.trNew.y, 
        opacity: this.opNew, 
        scale: this.scaleNew 
      }
    });

    return [
      React.cloneElement(elA, { key: 'ghost-a' }),
      React.cloneElement(elB, { key: 'ghost-b' }),
      React.cloneElement(elNew, { key: 'ghost-new' })
    ];
  }
}