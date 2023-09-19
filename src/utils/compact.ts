import { D3Node, OrgChartDataItem, OrgChartOptions } from '../types';
import { d3 } from '../constants';
import { getNumber } from './core';
import { getDirectChildren } from './children';

const groupBy = <T>(
  array: Array<T>,
  accessor: (item: T) => number,
  aggregator: (item: T[]) => number,
): [number, number][] => {
  const grouped: Record<number, T[]> = {};
  array.forEach((item) => {
    const key = accessor(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  const result: Record<number, number> = {};
  (Object.keys(grouped) as unknown as number[]).forEach((key) => {
    result[key] = aggregator(grouped[key]);
  });
  return Object.entries(result) as unknown as [number, number][];
};

export const calculateCompactFlexDimensions = <TData extends OrgChartDataItem = OrgChartDataItem>(
  root: D3Node<TData>,
  options: OrgChartOptions<TData>,
) => {
  root.eachBefore((node) => {
    node.firstCompact = undefined;
    node.compactEven = undefined;
    node.flexCompactDim = undefined;
    node.firstCompactNode = undefined;
    if (options.compactNoChildren) {
      const children = getDirectChildren(node);
      node.compactNoChildren = children.length > 0 && children.every((d) => !options.isNodeButtonVisible(d));
    }
  });
  root.eachBefore((node) => {
    if (node.children && node.children.length > 1) {
      const compactChildren = options.compactNoChildren ? node.children : node.children.filter((d) => !d.children);

      if (compactChildren.length < 2) return;

      const maxColumnDimension = d3.max(
        compactChildren,
        options.layoutBindings[options.layout].compactDimension.sizeColumn,
      )!;

      const calculateCompactDimension = () => {
        compactChildren.forEach((child, i) => {
          if (!i) {
            child.firstCompact = true;
          }
          child.compactEven = !(i % 2);
          child.row = Math.floor(i / 2);
        });
        const columnSize = maxColumnDimension * 2;
        const rowsMapNew = groupBy(
          compactChildren,
          (d) => d.row!,
          (reducedGroup) =>
            d3.max(
              reducedGroup,
              (d) =>
                options.layoutBindings[options.layout].compactDimension.sizeRow(d) + options.compactMarginBetween(d),
            ) ?? 0,
        );
        const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
        compactChildren.forEach((node) => {
          node.firstCompactNode = compactChildren[0];
          if (node.firstCompact) {
            node.flexCompactDim = [
              columnSize + options.compactMarginPair(node),
              rowSize - options.compactMarginBetween(node),
            ];
          } else {
            node.flexCompactDim = [0, 0];
          }
        });
        node.flexCompactDim = undefined;
      };

      const calculateCompactAsGroupDimension = () => {
        const columnSize = maxColumnDimension;
        compactChildren[0].firstCompact = true;

        if (node.compactNoChildren) {
          const widthWithPaddings = columnSize + 2 * options.compactNoChildrenMargin;
          const heightWithPaddings =
            2 * options.compactNoChildrenMargin +
            d3.sum(
              compactChildren,
              (d) =>
                options.layoutBindings[options.layout].compactDimension.sizeRow(d) + options.compactMarginBetween(d),
            ) -
            options.compactMarginBetween(node);

          compactChildren.forEach((node, i) => {
            node.firstCompactNode = compactChildren[0];
            if (i === 0) {
              node.flexCompactDim = [widthWithPaddings, heightWithPaddings];
            } else {
              node.flexCompactDim = [0, 0];
            }
          });

          node.flexCompactDim = undefined;
        }
      };

      if (options.compactNoChildren) {
        calculateCompactAsGroupDimension();
      } else {
        calculateCompactDimension();
      }
    }
  });
};

export const calculateCompactFlexPositions = <TData extends OrgChartDataItem = OrgChartDataItem>(
  root: D3Node<TData>,
  options: OrgChartOptions<TData>,
) => {
  root.eachBefore((node) => {
    if (node.children) {
      const compactChildren = node.children.filter((d) => d.flexCompactDim);
      const fch = compactChildren[0];
      if (!fch) {
        return;
      }

      const setCompactX = () => {
        compactChildren.forEach((child, i) => {
          if (i === 0) fch.x -= getNumber(fch.flexCompactDim?.[0]) / 2;
          if (i && (i % 2) - 1)
            child.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.25 - options.compactMarginPair(child) / 4;
          else if (i)
            child.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.75 + options.compactMarginPair(child) / 4;
        });
        const centerX = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.5;
        fch.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.25 - options.compactMarginPair(fch) / 4;
        const offsetX = node.x - centerX;
        if (Math.abs(offsetX) < 10) {
          compactChildren.forEach((d) => (d.x += offsetX));
        }
      };

      const setCompactY = () => {
        const rowsMapNew = groupBy(
          compactChildren,
          (d) => d.row!,
          (reducedGroup) =>
            d3.max(reducedGroup, (d) => options.layoutBindings[options.layout].compactDimension.sizeRow(d)) ?? 0,
        );
        const cumSum = d3.cumsum(rowsMapNew.map((d) => d[1] + options.compactMarginBetween()));
        compactChildren.forEach((node) => {
          if (node.row) {
            node.y = fch.y + cumSum[node.row - 1];
          } else {
            node.y = fch.y;
          }
        });
      };

      const setCompactAsGroupX = () => {
        const centerX = fch.x;
        compactChildren.forEach((d) => {
          d.x = centerX;
        });
      };

      const setCompactAsGroupY = () => {
        const cumSum = d3.cumsum(
          compactChildren.map(
            (d) => options.layoutBindings[options.layout].compactDimension.sizeRow(d) + options.compactMarginBetween(d),
          ),
        );

        const initialY = fch.y;
        compactChildren.forEach((node, i) => {
          node.y = initialY + (i === 0 ? 0 : cumSum[i - 1]);
        });
      };

      if (options.compactNoChildren) {
        if (node.compactNoChildren) {
          setCompactAsGroupX();
          setCompactAsGroupY();
        }
      } else {
        setCompactX();
        setCompactY();
      }
    }
  });
};
