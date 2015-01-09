function mkPatchProperty(proto) {
   Object.defineProperty(proto, "patch", {
      enumerable : false,
      value      : function(src) {
         var self = this;
         Object.getOwnPropertyNames(src).forEach(function(name) {
            Object.defineProperty(self, name, Object.getOwnPropertyDescriptor(src, name));
         });
         return this;
      }
   });
}


/*
 - АВЛ-дерево, сбалансированное дерево
 http://ru.wikipedia.org/wiki/%D0%90%D0%92%D0%9B-%D0%B4%D0%B5%D1%80%D0%B5%D0%B2%D0%BE
 http://en.wikipedia.org/wiki/AVL_tree

 - Декартово дерево, дерево с приоритетами, Treap, Cartesian Tree
 http://habrahabr.ru/post/101818/
 http://ru.wikipedia.org/wiki/%C4%E5%EA%E0%F0%F2%EE%E2%EE_%E4%E5%F0%E5%E2%EE
 http://en.wikipedia.org/wiki/Treap
 */
module.exports = CartesianTree;

function CartesianTree() {
   this._root = null;
}

var p = CartesianTree.prototype;

/*
 * Увеличение веса элемента
 */
p.add = function(key, val) {
   var node = this._insert(key); // - вставляем/находим ключ
   node.v += val;                // - увеличиваем
   this._bubbleUp(node);         // - "всплываем" элемент
};

/*
 * Инкремент веса элемента
 */
p.inc = function(key) {
   return this.add(key, 1);
};

/*
 * Уменьшение веса элемента
 */
p.sub = function(key, val) {
   var node = this._insert(key); // - вставляем/находим ключ
   node.v -= val;                // - уменьшаем
   this._dropDown(node);         // - "проваливаем" элемент
};

/*
 * Декремент веса элемента
 */
p.dec = function(key) {
   return this.sub(key, 1);
};

/*
 * Обход дерева для редукции
 */
p._reduce = function(node, accumulator, idx, initialValue) {
   var res = initialValue;

   if (!node) {
      return res;
   }

   node.l ? res = this._reduce(node.l, accumulator, idx, res) : 0;
   res = accumulator.call(
      undefined
      , res
      , {
         key : node.k
         , val : node.v
      }
      , idx + (node.l ? node.l.s : 0)
      , this);
   node.r ? res = this._reduce(node.r, accumulator, idx + (node.l ? node.l.s : 0) + 1, res) : 0;
   return res;
};

/*
 * Редукция дерева
 * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/Reduce
 *  - prev
 *  - curr = {key, val}
 *  - index
 *  - this
 */
p.reduce = function(accumulator, initialValue) {
   if(typeof accumulator !== "function") {
      throw new TypeError("First argument is not callable");
   }
   return this._reduce(this._root, accumulator, 0, initialValue);
};

/*
 * Превращение дерева в массив с сортировкой по ключам
 */
p.toArray = function() {
   return this.reduce(function(arr, node) {
      arr.push(node);
      return arr;
   }, []);
};

/*
 * Превращение дерева в объект
 */
p.toObject = function() {
   return this.reduce(function(obj, node) {
      obj[node.key] = node.val;
      return obj;
   }, {});
};


/*
 * Рекурсивный поиск значения в массиве
 * - включая/исключая само значение
 */
var find = function(args, l, r, val, inclusive) {
   if (l >= r - 1) {
      return inclusive ? l : r;
   }

   var i  = l + Math.floor((r - l)/2)
      , fl = args[i] < val || (inclusive && args[i] == val);
   return find(
      args
      , fl ? i : l
      , fl ? r : i
      , val
      , inclusive
   );
};

var scanByOrder = function(args, rv, l, r, curr) {
   if (!curr) {
      return;
   }

   var wl  = l.w + (curr.l ? curr.l.w : 0)
      , wr  = wl + curr.v
      , wt  = wr + (curr.r ? curr.r.w : 0);

   /*
    * Определение границ текущего узла в массиве порядковых номеров
    * - для элемента 2 веса 2 : (1,2) <- (2,2) -> (3,1)
    * [ -1, 0, 1 | 2, 3 | 4, 5 ]
    *         eql|      |eqr
    */

   var eq  = find(args, l.i, r.i, wl, true)
      , eql = eq + (args[eq] < wl ? 1 : 0)
      , eqr
      , i;

   /*
    * Рекурсивный набор для левого потомка и левого диапазона
    */
   if (l.i < eql) {
      if (curr.l) {
         scanByOrder(
            args
            , rv
            , l
            , {
               i : eql
               , s : r.s + (curr.r ? curr.r.s : 0) + 1
               , w : r.w + (curr.r ? curr.r.w : 0) + curr.v
            }
            , curr.l);
      }
      else {
         for (i = l.i; i < eql; i++) {
            rv.push({
               k  : curr.k
               , lt : {
                  s : l.s
                  , w : l.w
               }
               , eq : {
                  s : (args[i] >= wl && args[i] < wr ? 1 : 0)
                  , w : (args[i] >= wl && args[i] < wr ? curr.v : 0)
               }
               , gt : {
                  s : r.s + (args[i] > wr ? 1 : 0)
                  , w : r.w + (args[i] > wr ? curr.v : 0)
               }
            });
         }
      }
   }

   /*
    * Вывод статистик для текущего узла
    */
   for (eqr = eql; args[eqr] < wr && eqr < r.i; eqr++) {
      if (args[eqr] >= wl) {
         rv.push({
            k  : curr.k
            , lt : {
               s : l.s + (curr.l ? curr.l.s : 0)
               , w : l.w + (curr.l ? curr.l.w : 0)
            }
            , eq : {
               s : 1
               , w : curr.v
            }
            , gt : {
               s : r.s + (curr.r ? curr.r.s : 0)
               , w : r.w + (curr.r ? curr.r.w : 0)
            }
         });
      }
   }

   /*
    * Рекурсивный набор для правого потомка и правого диапазона
    */
   if (eqr < r.i) {
      if (curr.r) {
         scanByOrder(
            args
            , rv
            , {
               i : eqr
               , s : l.s + (curr.l ? curr.l.s : 0) + 1
               , w : l.w + (curr.l ? curr.l.w : 0) + curr.v
            }
            , r
            , curr.r);
      }
      else {
         for (i = eqr; i < r.i; i++) {
            rv.push({
               k  : curr.k
               , lt : {
                  s : l.s + (args[i] < wl ? 1 : 0)
                  , w : l.w + (args[i] < wl ? curr.v : 0)
               }
               , eq : {
                  s : (args[i] >= wl && args[i] < wr ? 1 : 0)
                  , w : (args[i] >= wl && args[i] < wr ? curr.v : 0)
               }
               , gt : {
                  s : r.s
                  , w : r.w
               }
            });
         }
      }
   }
};

var cmp = function(a, b) {return a - b;};

/*
 * Class : CartesianTree.StatByOrder
 */
CartesianTree.prototype.StatByOrder = function(self) {
   this.patch(self);
};

mkPatchProperty(CartesianTree.prototype.StatByOrder.prototype);

/*
 * Множественный набор статистики по порядковым номерам
 */
p.statByOrder = function(args) {
   if (args === undefined || args === null) {
      return {
         s : this._root ? this._root.s : 0
         , w : this._root ? this._root.w : 0
      };
   }

   var rv      = []
      , isArray = args instanceof Array;

   if (isArray && args.length === 0) {
      return [];
   }

   /*
    *                        2 -> [ 2 ]
    * [ 2, 1, 5, -1, 0, 4, 3 ] -> [ -1, 0, 1, 2, 3, 4, 5 ]
    */
   isArray ? args.sort(cmp) : args = [args];

   /*
    * Групповой рекурсивный набор данных
    */
   scanByOrder(
      args
      , rv
      , {
         i : 0
         , s : 0
         , w : 0
      }
      , {
         i : args.length
         , s : 0
         , w : 0
      }
      , this._root);

   if (rv.length === 0) {
      rv.push({
            k  : null
            , lt : {
               s : 0
               , w : 0
            }
            , eq : {
               s : 0
               , w : 0
            }
            , gt : {
               s : 0
               , w : 0
            }
         }
      );
   }

   return new this.StatByOrder(isArray ? args.reduce(function(obj, key, i) {
      obj[key] = rv[i];
      return obj;
   }, {}) : rv[0]);
};

/*
 * Class : CartesianTree.StatByPercentile
 */
CartesianTree.prototype.StatByPercentile = function(self) {
   this.patch(self);
};

mkPatchProperty(CartesianTree.prototype.StatByPercentile.prototype);

/*
 * Множественный набор статистики по персентилям
 */
p.statByPercentile = function(args) {
   if (args === undefined || args === null) {
      return null;
   }

   var ln      = (this._root ? this._root.w : 0)
      , isArray = args instanceof Array;

   if (isArray && args.length === 0) {
      return [];
   }

   !isArray ? args = [args] : 0;

   var stats;

   /*
    * Набор порядковых номеров элементов для расчета
    */
   stats = args.reduce(function(obj, percentile) {
      var k = percentile * ln - 1;

      if (k <= 0) {
         obj[0] = null;
      }
      else if (k >= ln - 1) {
         obj[ln - 1] = null;
      }
      else {
         obj[Math.floor(k)] = null;
         obj[Math.ceil(k)] = null;
      }
      return obj;
   }, {});

   /*
    * Набор статистик по порядковым номерам
    */
   stats = this.statByOrder(Object.keys(stats).map(function(val) {
      return parseInt(val, 10);
   }));

   /*
    * Расчет персентилей
    */
   stats = args.reduce(function(obj, percentile) {
      var k   = percentile * ln - 1
         , lte = Math.min(Math.max(Math.floor(k + 1), 0), ln)
         , rv  = {};

      if (k <= 0) {
         rv = stats[0];
      }
      else if (k >= ln - 1) {
         rv = stats[ln - 1];
      }
      else {
         var lower = stats[Math.floor(k)]
            , upper = stats[Math.ceil(k)];

         if (lower.k == upper.k) {
            rv = lower;
         }
         else {
            rv = {
               k  : lower.k + (k - Math.floor(k)) * (upper.k - lower.k)
               , lt : {
                  s : lower.lt.s + lower.eq.s
                  , w : lower.lt.w + lower.eq.w
               }
               , eq : {
                  s : 0
                  , w : 0
               }
               , gt : {
                  s : upper.gt.s + upper.eq.s
                  , w : upper.gt.w + upper.eq.w
               }
            }
         }
      }

      obj[percentile] = rv;
      return obj;
   }, {});

   return new this.StatByPercentile(isArray ? stats : stats[args[0]]);
};

var scanByValue = function(args, rv, l, r, curr) {
   var eq  = find(args, l.i, r.i, curr.k, true)
      , eql = eq + (args[eq] != curr.k ? 1 : 0)
      , eqr = eq + 1
      , i;

   if (l.i < eql) {
      if (curr.l) {
         scanByValue(
            args
            , rv
            , l
            , {
               i : eql
               , s : r.s + (curr.r ? curr.r.s : 0) + 1
               , w : r.w + (curr.r ? curr.r.w : 0) + curr.v
            }
            , curr.l);
      }
      else {
         for (i = l.i; i < eql; i++) {
            rv.push({
               lte : {
                  s : l.s + (args[i] == curr.k ? 1 : 0)
                  , w : l.w + (args[i] == curr.k ? curr.v : 0)
               }
               , gt : {
                  s : r.s + (curr.r ? curr.r.s : 0) + (args[i] < curr.k ? 1 : 0)
                  , w : r.w + (curr.r ? curr.r.w : 0) + (args[i] < curr.k ? curr.v : 0)
               }
            });
         }
      }
   }

   for (i = eql; i < eqr; i++) {
      rv.push({
         lte : {
            s : l.s + (curr.l ? curr.l.s : 0) + 1
            , w : l.w + (curr.l ? curr.l.w : 0) + curr.v
         }
         , gt : {
            s : r.s + (curr.r ? curr.r.s : 0)
            , w : r.w + (curr.r ? curr.r.w : 0)
         }
      });
   }

   if (eqr < r.i) {
      if (curr.r) {
         scanByValue(
            args
            , rv
            , {
               i : eqr
               , s : l.s + (curr.l ? curr.l.s : 0) + 1
               , w : l.w + (curr.l ? curr.l.w : 0) + curr.v
            }
            , r
            , curr.r);
      }
      else {
         for (i = eqr; i < r.i; i++) {
            rv.push({
               lte : {
                  s : l.s + (curr.l ? curr.l.s : 0) + 1
                  , w : l.w + (curr.l ? curr.l.w : 0) + curr.v
               }
               , gt : {
                  s : r.s
                  , w : r.w
               }
            });
         }
      }
   }
};

/*
 * Множественный набор статистики по значениям
 */
p.statByValue = function(args) {
   if (args === undefined || args === null) {
      return null;
   }

   var rv      = []
      , isArray = args instanceof Array;

   if (isArray && args.length === 0) {
      return [];
   }

   isArray ? args.sort(cmp) : args = [args];

   /*
    * Убираем дубли
    */
   args = args.filter(function(val, i) {
      return i === 0 || val != args[i - 1];
   });

   /*
    * Групповой рекурсивный набор данных
    */
   scanByValue(
      args
      , rv
      , {
         i : 0
         , s : 0
         , w : 0
      }
      , {
         i : args.length
         , s : 0
         , w : 0
      }
      , this._root);

   if (rv.length === 0) {
      rv.push({
         lte : {
            s : 0
            , w : 0
         }
         , gt : {
            s : 0
            , w : 0
         }
      });
   }

   return isArray ? args.reduce(function(obj, key, i) {
      obj[key] = rv[i];
      return obj;
   }, {}) : rv[0];
};

/*
 * Вывод структуры дерева
 */
p.print = function() {
   console.log('\n' + require('util').inspect(this._root, showHidden = false, depth = null, colorize = true));
};

// ---- private

/*
 * Поиск элемента
 */
p._find = function(key, node) {
   node = node || this._root;

   if (!node) {
      return [null, key];
   }

   if (key == node.k) {
      return node;
   }

   var next = node[key < node.k ? 'l' : 'r'];
   return next ? this._find(key, next) : [node, key - node.k];
};

/*
 * Class : CartesianTree.Node
 */
CartesianTree.prototype.Node = function(key) {
   this.k = key; // узел : ключ
   this.v = 0;   // узел : значение/вес/приоритет
   this.s = 1;   // поддерево : размер
   this.d = 1;   // поддерево : глубина
   this.w = 0;   // поддерево : вес

   this.p = null;
   this.l = null;
   this.r = null;
}

/*
 * Вставка (поиск) элемента в дереве
 */
p._insert = function(key) {
   var result = this._find(key);

   if (result instanceof Array) {      // - вставка
      var nodeP = result[0]
         , nodeC = new this.Node(key);

      if (nodeP) {                      // - предок есть
         nodeC.p = nodeP;
         nodeP[result[1] < 0 ? 'l' : 'r'] = nodeC;
      }
      else {                            // - предка нет, текущий узел - корень
         this._root = nodeC;
      }
      return nodeC;
   }
   return result;                      // - узел найден
};

/*
 * Малое вращение дерева
 */
p._rotateSmall = function(node) {
   var l0 = node
      , l1 = node.p;

   if (!l1.p) {
      l0.p = null;
      this._root = l0;
   }
   else {
      l0.p = l1.p;
      l1.p[l1.k < l1.p.k ? 'l' : 'r'] = l0;
   }

   if (l0[l0.k > l1.k ? 'l' : 'r']) {
      l0[l0.k > l1.k ? 'l' : 'r'].p = l1;
      l1[l0.k < l1.k ? 'l' : 'r'] = l0[l0.k > l1.k ? 'l' : 'r'];
   }
   else {
      l1[l0.k < l1.k ? 'l' : 'r'] = null;
   }

   l1.p = l0;
   l0[l0.k > l1.k ? 'l' : 'r'] = l1;

   this._updateNode(l1);
   this._updateNode(l0);
   if (l0.p) {
      this._updateNode(l0.p);
   }
};

/*
 * Большое вращение дерева
 */
p._rotateLarge = function(node) {
   this._rotateSmall(node);
   this._rotateSmall(node);
};

/*
 * Балансировка дерева
 */
p._balance = function(node) {
   var l0 = node
      , l1 = l0.p;

   // нет предка - нечего балансировать
   if (!l1) {
      return false;
   }

   var l1dl = l1.l ? l1.l.d : 0
      , l1dr = l1.r ? l1.r.d : 0;

   if (   Math.abs(l1dl - l1dr) > 1          // - есть дисбаланс
      && l0.v == l1.v                       // - совпадают веса
      && (l1.k < l0.k) == (l1dl < l1dr)) {  // - совпадают направления обхода и дисбаланса
      this._rotateSmall(l0);                  // - меняем их местами
      return true;
   }

   var l2 = l1.p;

   // нет над-предка - нечего балансировать
   if (!l2) {
      return false;
   }

   if ((l0.k < l1.k) == (l1.k < l2.k)) {     // - совпадают направления обхода
      return this._balance(l1); // - проверяем баланс предка
   }
   else {
      var l2dl = l2.l ? l2.l.d : 0
         , l2dr = l2.r ? l2.r.d : 0;

      if (   Math.abs(l2dl - l2dr) > 1        // - есть дисбаланс
         && l0.v == l2.v) {                  // - совпадают веса
         this._rotateLarge(l0);                // - меняем их местами
         return true;
      }
   }
   return false;
};

/*
 * Обновление статистики поддерева узла
 */
p._updateNode = function(node) {
   if (node.l && node.r) {
      node.d = Math.max(node.l.d, node.r.d) + 1;
      node.s = node.l.s + node.r.s + 1;
      node.w = node.l.w + node.r.w + node.v;
   }
   else if (!node.l && !node.r) {
      node.d = 1;
      node.s = 1;
      node.w = node.v;
   }
   else if (node.l) {
      node.d = node.l.d + 1;
      node.s = node.l.s + 1;
      node.w = node.l.w + node.v;
   }
   else {
      node.d = node.r.d + 1;
      node.s = node.r.s + 1;
      node.w = node.r.w + node.v;
   }
};

/*
 * Обновление глубины и размера поддеревьев
 */
p._updateTree = function(node) {
   var curr;
   for (curr = node; curr; curr = curr.p) {
      this._updateNode(curr);
   }
   for (curr = node; curr; curr = curr.p) {
      this._balance(curr);
   }
};

/*
 * "Всплытие" элемента с большим весом
 */
p._bubbleUp = function(node) {
   while (node.p && node.p.v < node.v) {
      this._rotateSmall(node);
   }
   this._updateTree(node);
};

/*
 * "Всплытие" элемента с большим весом
 */
p._deleteNode = function(node) {
   while (node.p && node.p.v < node.v) {
      this._rotateSmall(node);
   }
   this._updateTree(node);
};

/*
 * "Проваливание" элемента с меньшим весом
 */
p._dropDown = function(node, first) {
   var l0 = node
      , l1 = node.p;

   if (!l0.l && !l0.r && l0.v === 0) {
      if (!l1) {
         this._root = null;
      }
      else {
         l1[l0.k < l1.k ? 'l' : 'r'] = null;
         this._updateNode(l1);
      }

      if (first !== false) {
         this._updateTree(l1);
      }
      return;
   }

   var lv = (l0.l ? l0.l.v : 0)
      , rv = (l0.r ? l0.r.v : 0)
      , ld = (l0.l ? l0.l.d : 0)
      , rd = (l0.r ? l0.r.d : 0)
      , lw = (l0.l ? l0.l.w : 0)
      , rw = (l0.r ? l0.r.w : 0);

   if (l0.v < lv || l0.v < rv) {
      this._rotateSmall(lv > rv || (lv == rv && ld > rd) || (lv == rv && ld == rd && lw > rw) ? l0.l : l0.r);
      this._dropDown(l0, false);
   }

   if (first !== false) {
      this._updateTree(!l0.l && !l0.r && Math.abs(ld - rd) < 2 ? l0 : l0[ld > rd ? 'l' : 'r']);
   }
};