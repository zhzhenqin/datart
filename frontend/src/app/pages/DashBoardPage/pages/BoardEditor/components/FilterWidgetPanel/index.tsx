/**
 * Datart
 *
 * Copyright 2021
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Form, Modal } from 'antd';
import { Split } from 'app/components';
import useI18NPrefix from 'app/hooks/useI18NPrefix';
import { BoardContext } from 'app/pages/DashBoardPage/contexts/BoardContext';
import { selectViewMap } from 'app/pages/DashBoardPage/pages/Board/slice/selector';
import {
  ControllerWidgetContent,
  RelatedView,
  Relation,
} from 'app/pages/DashBoardPage/pages/Board/slice/types';
import {
  convertToWidgetMap,
  createFilterWidget,
  getCanLinkFilterWidgets,
  getOtherStringControlWidgets,
} from 'app/pages/DashBoardPage/utils/widget';
import {
  ChartDataViewFieldCategory,
  ChartDataViewFieldType,
} from 'app/types/ChartDataView';
import { ControllerFacadeTypes } from 'app/types/FilterControlPanel';
import produce from 'immer';
import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components/macro';
import { SPACE_XS } from 'styles/StyleConstants';
import { v4 as uuidv4 } from 'uuid';
import { editBoardStackActions, editDashBoardInfoActions } from '../../slice';
import { selectFilterPanel, selectSortAllWidgets } from '../../slice/selectors';
import { addWidgetsToEditBoard } from '../../slice/thunk';
import { RelatedViewForm } from './RelatedViewForm';
import { RelatedWidgetItem, RelatedWidgets } from './RelatedWidgets';
import { ValueTypes, WidgetFilterFormType } from './types';
import {
  formatWidgetFilter,
  getInitWidgetFilter,
  preformatWidgetFilter,
} from './utils';
import { WidgetFilterForm } from './WidgetFilterForm';

const FilterWidgetPanel: React.FC = memo(props => {
  const dispatch = useDispatch();
  const t = useI18NPrefix('viz.common.enum.controllerFacadeTypes');
  const { type, widgetId } = useSelector(selectFilterPanel);
  const { boardId, boardType, queryVariables } = useContext(BoardContext);

  const allWidgets = useSelector(selectSortAllWidgets);
  const widgets = useMemo(
    () => getCanLinkFilterWidgets(allWidgets),
    [allWidgets],
  );
  const otherStrFilterWidgets = useMemo(
    () => getOtherStringControlWidgets(allWidgets, widgetId),
    [allWidgets, widgetId],
  );
  const widgetMap = useMemo(() => convertToWidgetMap(allWidgets), [allWidgets]);
  const viewMap = useSelector(selectViewMap);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hide = !type || type === 'hide';
    setVisible(!hide);
  }, [type]);
  const [form] = Form.useForm();
  const curFilterWidget = useMemo(
    () => widgetMap[widgetId] || undefined,
    [widgetId, widgetMap],
  );

  const [fieldValueType, setFieldValueType] = useState<ValueTypes>(
    ChartDataViewFieldType.STRING,
  );
  const [fieldCategory, setFieldCategory] =
    useState<ChartDataViewFieldCategory>(ChartDataViewFieldCategory.Field);

  const [relatedViews, setRelatedViews] = useState<RelatedView[]>([]);
  let widgetList = useRef<RelatedWidgetItem[]>([]);

  const onChangeFieldProps = useCallback(
    (views: RelatedView[] | undefined) => {
      let relatedViews: RelatedView[] = [];
      if (views) {
        relatedViews = views;
      } else {
        relatedViews = form?.getFieldValue('relatedViews');
      }

      const trimmedViews = relatedViews.filter(
        item => item.fieldValue && item.fieldValueType,
      );
      if (!trimmedViews || trimmedViews.length < 1) {
        setFieldValueType(ChartDataViewFieldType.STRING);
        return;
      }
      setFieldValueType(
        trimmedViews[0].fieldValueType || ChartDataViewFieldType.STRING,
      );
      const hasVariable = trimmedViews.find(
        view => view.relatedCategory === ChartDataViewFieldCategory.Variable,
      );
      // 如果有变量 就按变量处理

      setFieldCategory(
        hasVariable
          ? ChartDataViewFieldCategory.Variable
          : ChartDataViewFieldCategory.Field,
      );

      form.validateFields();
    },
    [form],
  );
  const setViews = useCallback(
    (widgetOptions: RelatedWidgetItem[]) => {
      widgetList.current = widgetOptions;

      const nextRelatedViews: RelatedView[] = [];
      widgetOptions.forEach(option => {
        const widget = widgetMap[option.widgetId];
        if (!widget) return;
        widget.viewIds.forEach((viewId, index) => {
          const newViewItem = nextRelatedViews.find(
            view => view.viewId === viewId,
          );
          if (newViewItem) return;
          const view = viewMap[viewId];
          if (!view) return;
          const relatedView: RelatedView = {
            viewId: view.id,
            relatedCategory: ChartDataViewFieldCategory.Field,
            fieldValue: '',
            fieldValueType: ChartDataViewFieldType.STRING,
          };
          nextRelatedViews.push(relatedView);
        });
      });
      setRelatedViews(nextRelatedViews);
      console.log('nextRelatedViews', nextRelatedViews);
      onChangeFieldProps(nextRelatedViews);
    },
    [onChangeFieldProps, viewMap, widgetMap],
  );

  // 初始化数据
  useEffect(() => {
    if (!curFilterWidget || !curFilterWidget?.relations) {
      setViews([]);
      form.setFieldsValue({
        widgetFilter: preformatWidgetFilter(getInitWidgetFilter()),
        type: '',
        fieldValueType: ChartDataViewFieldType.STRING,
      });

      return;
    }
    const confContent = curFilterWidget.config
      .content as ControllerWidgetContent;
    try {
      const { relatedViews, type, widgetFilter } = confContent;
      form.setFieldsValue({
        type,
        filterName: curFilterWidget.config.name,
        relatedViews,
        widgetFilter: preformatWidgetFilter(widgetFilter),
      });
    } catch (error) {}
    const widgetOptions = curFilterWidget?.relations
      .filter(ele => ele.config.type === 'filterToWidget')
      .map(item => {
        const option: RelatedWidgetItem = {
          widgetId: item.targetId,
        };
        return option;
      });
    setViews(widgetOptions);
  }, [curFilterWidget, setViews, form]);

  const onFinish = useCallback(
    values => {
      console.log('--values', values);
      console.log('--fieldValueType', fieldValueType);
      console.log('--fieldCategory', fieldCategory);

      const { relatedViews, widgetFilter, filterName, type } = values;
      if (type === 'add') {
        const sourceId = uuidv4();
        const filterToWidgetRelations: Relation[] = widgetList.current.map(
          option => {
            const widget = widgetMap[option.widgetId];
            const relation: Relation = {
              sourceId,
              targetId: widget.id,
              config: {
                type: 'filterToWidget',
                filterToWidget: {
                  widgetRelatedViewIds: widget.viewIds,
                },
              },
              id: uuidv4(),
            };
            return relation;
          },
        );
        const newRelations = [...filterToWidgetRelations];
        const filterVisibility = (widgetFilter as WidgetFilterFormType)
          .visibility;
        if (filterVisibility) {
          const { visibilityType: visibility, condition } = filterVisibility;
          if (visibility === 'condition' && condition) {
            const filterToFilterRelation: Relation = {
              sourceId,
              targetId: condition.dependentFilterId,
              config: {
                type: 'filterToFilter',
              },
              id: uuidv4(),
            };
            newRelations.concat([filterToFilterRelation]);
          }
        }

        const widget = createFilterWidget({
          boardId,
          boardType,
          filterName,
          relations: newRelations,
          controllerType: ControllerFacadeTypes.DropdownList,
          views: relatedViews,
          fieldValueType: fieldValueType,
          widgetFilter: formatWidgetFilter(widgetFilter),
          hasVariable: fieldCategory === ChartDataViewFieldCategory.Variable,
        });

        dispatch(addWidgetsToEditBoard([widget]));
      } else if (type === 'edit') {
        const sourceId = curFilterWidget.id;

        const filterToWidgetRelations: Relation[] = widgetList.current
          .filter(option => {
            return widgetMap[option.widgetId];
          })
          .map(option => {
            const widget = widgetMap[option.widgetId];
            return {
              sourceId,
              targetId: widget.id,
              config: {
                type: 'filterToWidget',
                filterToWidget: {
                  widgetRelatedViewIds: widget.viewIds,
                },
              },
              id: uuidv4(),
            };
          });
        const newRelations = [...filterToWidgetRelations];
        const filterVisibility = (widgetFilter as WidgetFilterFormType)
          .visibility;
        if (filterVisibility) {
          const { visibilityType: visibility, condition } = filterVisibility;
          if (visibility === 'condition' && condition) {
            const filterToFilterRelation: Relation = {
              sourceId,
              targetId: condition.dependentFilterId,
              config: {
                type: 'filterToFilter',
              },
              id: uuidv4(),
            };
            newRelations.concat([filterToFilterRelation]);
          }
        }
        const nextContent: ControllerWidgetContent = {
          ...curFilterWidget.config.content,
          relatedViews,
          type: ControllerFacadeTypes.DropdownList,
          fieldValueType: fieldValueType,
          widgetFilter: formatWidgetFilter(widgetFilter),
          hasVariable: fieldCategory === ChartDataViewFieldCategory.Variable,
        };
        const newWidget = produce(curFilterWidget, draft => {
          draft.relations = newRelations;
          draft.config.name = filterName;
          draft.config.content = nextContent;
        });
        dispatch(editBoardStackActions.updateWidget(newWidget));
      }
      setVisible(false);
    },
    [
      boardId,
      boardType,
      curFilterWidget,
      dispatch,
      fieldCategory,
      fieldValueType,
      widgetMap,
    ],
  );
  const onSubmit = useCallback(() => {
    form.submit();
  }, [form]);

  const formItemStyles = {
    labelCol: { span: 4 },
    wrapperCol: { span: 20 },
  };
  const afterClose = useCallback(() => {
    form.resetFields();
    dispatch(
      editDashBoardInfoActions.changeFilterPanel({
        type: 'hide',
        widgetId: '',
      }),
    );
  }, [dispatch, form]);
  const onChangeRelatedWidgets = (values: any) => {
    console.log('values', values);
    setViews(values);
  };
  return (
    <Modal
      title={`${type} ${t(ControllerFacadeTypes.DropdownList)}`}
      visible={visible}
      onOk={onSubmit}
      centered
      destroyOnClose
      width={1100}
      afterClose={afterClose}
      onCancel={() => setVisible(false)}
    >
      <Form
        form={form}
        size="middle"
        {...formItemStyles}
        requiredMark={false}
        onFinish={onFinish}
        preserve
      >
        <Container className="datart-split">
          <div>
            <WidgetFilterForm
              otherStrFilterWidgets={otherStrFilterWidgets}
              boardType={boardType}
              fieldCategory={fieldCategory}
              fieldValueType={fieldValueType}
              viewMap={viewMap}
              form={form}
            />
          </div>
          <div className="split-left">
            <RelatedWidgets
              relatedWidgets={[
                { widgetId: '0960ec696e5a4139a42aceb92f2fe5d3' },
              ]}
              widgets={widgets}
              onChange={onChangeRelatedWidgets}
            />
            <RelatedViewForm
              relatedViews={relatedViews}
              onChangeFieldProps={onChangeFieldProps}
              form={form}
              fieldValueType={fieldValueType}
              viewMap={viewMap}
              queryVariables={queryVariables}
            />
          </div>
        </Container>
      </Form>
    </Modal>
  );
});

export default FilterWidgetPanel;
const Container = styled(Split)`
  display: flex;
  flex: 1;

  .split-left {
    padding: ${SPACE_XS};
    background-color: ${p => p.theme.componentBackground};
    border-right: 1px solid ${p => p.theme.borderColorSplit};
  }
`;
