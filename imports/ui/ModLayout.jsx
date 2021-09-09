import React, { Fragment, useEffect, useState } from 'react';

import Collapse from 'antd/lib/collapse';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import DatePicker from 'antd/lib/date-picker';
import Radio from 'antd/lib/radio';
import Divider from 'antd/lib/divider';
import Select from 'antd/lib/select';
import Spin from 'antd/lib/spin';
import List from 'antd/lib/list';
import Skeleton from 'antd/lib/skeleton';
import Avatar from 'antd/lib/avatar';
import Table from 'antd/lib/table';
import Image from 'antd/lib/image';
import Button from 'antd/lib/button';

import Space from 'antd/lib/space';
import message from 'antd/lib/message';

import Row from 'antd/lib/row';
import Col from 'antd/lib/col';

import DeleteOutlined from '@ant-design/icons/DeleteOutlined';


import { withTracker } from 'meteor/react-meteor-data';
import GoogleMapReact from 'google-map-react';

const { Panel } = Collapse;
const { Option } = Select;

import { 
    ctCollapsible, ctInlineCombination,
    ctStringInput, ctOptionInput, ctDateInput,
    ctDivider,
    ctSingleModuleOption,
    ctReport,
    ctColumns,
    ctGoogleMap
} from '../../imports/coreapi/controltypes';

import { debounce } from '../coreapi/helpers/basics';

import { getModuleStore } from '../coreapi';
import { check } from 'meteor/check';

const getLabel = (elem, fields) => {
    if (elem.noTitle) return '';

    if (elem.title) return elem.title;

    return fields[elem.field].title;
}

const LayoutElements = ({ elements, mod, record, mode, onValuesChange }) => {
    return elements.map( (elem, index) => {
        if (elem.controlType === ctStringInput ) return <StringInput key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />
        if (elem.controlType === ctOptionInput ) return <OptionInput key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />
        if (elem.controlType === ctDateInput ) return <DateInput key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />
        
        if (elem.controlType === ctCollapsible ) return <Collapsible key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />
        if (elem.controlType === ctDivider ) return <DividerControl key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />
        if (elem.controlType === ctInlineCombination ) return <InlineCombination key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />

        if (elem.controlType === ctSingleModuleOption ) return <SingleModuleOption key={index} elem={elem} mod={mod} mode={mode} onValuesChange={onValuesChange} />

        if (elem.controlType === ctReport ) return <ReportControl key={index} reportId={elem.reportId} title={elem.title} mod={mod} mode={mode} record={record} onValuesChange={onValuesChange} />
        if (elem.controlType === ctColumns ) return <ColumnsLayout key={index} elem={elem} mod={mod} mode={mode} record={record} onValuesChange={onValuesChange} />
        if (elem.controlType === ctGoogleMap ) return <GoogleMap key={index} elem={elem} mod={mod} mode={mode} record={record} onValuesChange={onValuesChange} />

        return null;
    });
}

const useOnce = callback => {
    const [ firstime, setFirsttime ] = useState(true);

    if (firstime) {
        callback();
        setFirsttime(false);
    }
}

export const GoogleMap = ({ elem, mod, mode, record, onValuesChange }) => {
    const height = '500px', width = '100%';
    
    const [location, setLocation] = useState('');
    const computeLocation = eval(elem.googleMapDetails.location);

    useOnce( () => {
        const newLocation = computeLocation({ currentLocation:location, record, mode });
        if (newLocation !== location) setLocation(newLocation);
    });

    onValuesChange( (changedValues, allValues) => {
        const newLocation = computeLocation({ currentLocation:location, record, mode, allValues, changedValues });
        if (newLocation !== location) setLocation(newLocation);
    });


    const encodedLocation = encodeURIComponent(location);
    
    return (
        <div className="mapouter" style={{position:'relative',textAlign:'right', width, height}}>
            <div className="gmap_canvas" style={{overflow:'hidden',background:'none!important', width, height}}>
                <iframe width={width} height={height} id="gmap_canvas" src={"https://maps.google.com/maps?q=" + encodedLocation + "&t=&z=15&ie=UTF8&iwloc=&output=embed"} frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0">
                </iframe>
                <br />
                <a href="https://www.embedgooglemap.net">google html code</a>
            </div>
        </div>
    );
}

export const ColumnsLayout = ({ elem, mod, mode, record, onValuesChange }) => {
    const { columns } = elem;

    return (
        <Row gutter={8}>
            { 
                columns.map( (col, colIndex) => {
                    const { columnDetails } = col;
                    return (
                        <Col key={colIndex} { ...columnDetails } >
                            <LayoutElements elements={col.elements} mod={mod} mode={mode} record={record} onValuesChange={onValuesChange} />
                        </Col>
                    );
                })
            }
        </Row>
    )
}

export class ReportStatic extends React.Component {
    state = {
        loading: true,
        data: []
    }
    /*constructor(props){
        super (props);

        const { elem, mod, mode } = props;

        this.reportId = elem.reportId;

        this.state = {
            value: props.value || [],
            reportDefinition: {},
            fetchingDefinition: false,
            data: [],
            dataLoading: true
        }
    }

    loadData() {
        const { reportDefinition } = this.state;

        if (reportDefinition.static) {
            // static data > call once
            Meteor.call('reports.' + this.reportId, this.props.record, (err, data) => {
                if (err) {
                    message.error('Es ist ein unbekannter Systemfehler aufgetreten. Bitte wenden Sie sich an den Systemadministrator.' + err.message);
                    if (!this.unmounted) this.setState({ dataLoading: false });
                } else {
                    setTimeout( _ => {
                        if (!this.unmounted) this.setState({ data, dataLoading: false });
                    }, 500);
                }
            });    
        } else {
            const liveData = eval(reportDefinition.liveData);

            // realtime > subscribe data
            const v = useTracker( () => {
                console.log('Run Tracker');
                this.dataSubscription = Meteor.subscribe('reports.' + this.reportId);

                const dataCursor = liveData(this.props.record);
                
                this.setState({ data: dataCursor.fetching(), dataLoading: false });
            });

            console.log('ret from useTracker', v);
        }
    }*/

    loadData() {
        const reportId = this.props.report._id;
        const { reportParams } = this.props;
        
        Meteor.call('reports.' + reportId, { ...reportParams }, (err, data) => {
            if (err) {
                message.error('Es ist ein unbekannter Systemfehler aufgetreten. Bitte wenden Sie sich an den Systemadministrator.' + err.message);
                if (!this.unmounted) this.setState({ loading: false });
            } else {
                setTimeout( _ => {
                    if (!this.unmounted) this.setState({ data, loading: false });
                }, 500);
            }
        });
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.reportParams !== this.props.reportParams) {
            this.loadData();
        }
    }

    componentWillUnmount() {
		this.unmounted = true
	}

    render() {
        const { type, columns, title } = this.props.report;
        const { data, loading } = this.state;

        if (loading) return <Skeleton />;

        if (type == 'table') {
            //const pagination = { defaultPageSize:2, position: ['none', 'none' /*'bottomRight'*/] }
            const pagination = null; { position: ['none', 'none'] }
            return <Table rowKey="_id" dataSource={data} columns={columns} title={() => title } pagination={pagination} bordered />
        }

        return <div>Unbekannter Reporttype</div>
    }
}

export class ReportControl extends React.Component {
    state = {
        loading : true,
        report: {}
    }

    componentDidMount() {
        const { reportId } = this.props;
        
        Meteor.call('reports.getReportDefinition', { reportId }, (err, report) => {
            if (err) {
                message.error('Es ist ein unbekannter Systemfehler aufgetreten. Bitte wenden Sie sich an den Systemadministrator.' + err.message);
                this.setState({ loading: false });
            } else {
                report.columns = report.columns.map( c => {
                    const fnCode = c.render;
                    if (fnCode) {
                        c.render = function renderColumn(col, doc) {
                            let renderer = eval(fnCode);
                            return renderer(col, doc, report.additionalData || {});
                        }
                    };
                    
                    return c;
                });
                this.setState({ report, loading: false });
            }
        });
    }

    render() {
        const { loading, report } = this.state;
        const { isStatic } = report;

        if (loading) return <Skeleton />;

        if (isStatic) return <ReportStatic report={report} reportParams={{record: this.props.record}} />

        return <ReportLiveData report={report} reportParams={{record: this.props.record}} />
    }
}

class ReportLiveDataControl extends React.Component {
    render() {
        const { data, loading, report } = this.props;
        const { type, columns, title } = report;

        if (loading) return <Skeleton />;

        if (type == 'table') {
            return <Table rowKey="_id" dataSource={data} columns={columns} title={() => title + '(R)' } bordered />
        }

        return <div>Unbekannter Reporttype</div>
    }
}

export const ReportLiveData = withTracker( ({ report, reportParams }) => {
    const { _id, liveData } = report;

    fnLiveData = eval(liveData);
    
    const subscription = Meteor.subscribe('reports.' + _id, reportParams);
   
    return {
        loading: !subscription.ready(),
        data: fnLiveData(reportParams).fetch()
    };
})(ReportLiveDataControl);


class ModuleListInput extends React.Component {
    constructor(props){
        super (props);

        const { productId, moduleId, fieldId, mode } = props;

        this.state = {
            currentInput: '',
            value: props.value || [],
            fetching: false,
            options: []
        }

        this.selectRef = React.createRef();

        this.onSearch = debounce( currentInput => {
            const { value } = this.state;

            Meteor.call('modules.getModuleOptions', { productId, moduleId, fieldId, mode, currentInput, values: value }, (err, options) => {
                if (err) {
                    message.error('Es ist ein unbekannter Systemfehler aufgetreten. Bitte wenden Sie sich an den Systemadministrator.' + err.message);
                    this.setState({ fetching: false });
                } else {
                    this.setState({ options, fetching: false });
                }
            });
        }, 600, false, () => {
            this.setState({ fetching: true });
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.value !== this.props.value) {
            this.setState({ value: this.props.value });
        }
    }

    onSelectChange(selectedId) {        
        const { options, value } = this.state;
        const { targetProductId, targetModuleId } = this.props;

        const found = options.find( i => i._id === selectedId );
        
        const newValues = value.concat([{ 
            _id: selectedId, 
            title: found.title,
            imageUrl: found.imageUrl,
            description: found.description,
            link: found.link //`/records/${targetProductId}/${targetModuleId}/${v.value}`
        }]);
        this.setState({ value: newValues, currentInput: '' });

        const { onChange } = this.props;
        if (onChange) onChange(newValues);
    }

    removeSeletedItem({ _id }) {
        const { value } = this.state;
        const { onChange } = this.props;

        const newValues = value.filter( item => _id !== item._id);
        this.setState({ value: newValues });

        if (onChange) onChange(newValues);
    }

    render() {
        const { currentInput, value, options, fetching } = this.state;
        const { hasDescription, hasImage, linkable, mode } = this.props;

        const onSearch = this.onSearch.bind(this);
        const onChange = this.onSelectChange.bind(this);
        const removeSeletedItem = this.removeSeletedItem.bind(this);

        const getActionButtons = item => {
            if (mode === 'EDIT') 
                return [
                    <Button type="link" onClick={ _ => removeSeletedItem(item) } icon={<DeleteOutlined />} ></Button>
                ]
            return null
        };

        return <Fragment>
            <List
                itemLayout="horizontal"
                dataSource={ value }
                renderItem={ item => 
                    <List.Item 
                        actions={getActionButtons(item)}
                    >
                        <List.Item.Meta
                            avatar={hasImage ? <Image src={item.imageUrl} width={48} /> : null}
                            title={
                                (linkable && item.link) ? <a href={item.link}>{item.title}</a> : <span>{item.title}</span>
                            }
                            description={(hasDescription ? <span style={{fontSize:10}}>{item.description}</span> : null)}
                        />
                    </List.Item>
                }
            />

            { mode === 'SHOW' ? null :
                <Select
                    ref={this.selectRef}
                    showSearch
                    value={currentInput}
                    filterOption={false}
                    onSearch={onSearch}
                    onChange={onChange}
                    loading={fetching}
                    notFoundContent={fetching ? <Spin size="small" /> : null}
                >
                    { 
                        options.map( ({ _id, title, imageUrl, description }) => {
                            return (
                                <Option key={_id} value={_id}>
                                    { hasImage ? <Image src={imageUrl} width={32} /> : null }
                                    <span>{title}</span>
                                    { hasDescription ? <br /> : null }
                                    { hasDescription ? <span style={{fontSize:10,color:'#ccc'}}>{description}</span> : null }
                                </Option>
                            );
                        })
                    }
                </Select>
            }
        </Fragment>
    }
}

const SingleModuleOption = ({ elem, mod, mode, onValuesChange }) => {
    const [ fetching, setFetching ] = useState(false);
    const [ options, setOptions ] = useState([]);
    const [ selectedValues, setSelectedValues ] = useState([]);
    const [ enteredValue, setEnteredValue ] = useState('');

    const { _id, productId } = mod
    const moduleId = _id;
    
    const field = mod.fields[elem.field];
    const
        targetProductId = field.productId,
        targetModuleId = field.moduleId;

    return (
        <Fragment>
            <Form.Item 
                label={getLabel(elem, mod.fields)}
                name={elem.field}
                //rules={rules}
            >
                <ModuleListInput
                    productId={productId}
                    moduleId={moduleId}
                    fieldId={elem.field}

                    targetProductId={targetProductId}
                    targetModuleId={targetModuleId}

                    mode={mode}

                    hasDescription={field.moduleDetails.hasDescription}
                    hasImage={field.moduleDetails.hasImage}
                    linkable={field.moduleDetails.linkable}
                />
            </Form.Item>

        </Fragment>
    )
}

/*
const SingleModuleOption = ({ elem, mod, mode }) => {
    const [ fetching, setFetching ] = useState(false);
    const [ options, setOptions ] = useState([]);
    const [ selectedValues, setSelectedValues ] = useState([]);
    const [ enteredValue, setEnteredValue ] = useState('');

    const { _id, productId } = mod
    const moduleId = _id;
    const fieldId = elem.field;

    const field = mod.fields[elem.field];
    const
        targetProductId = field.productId,
        targetModuleId = field.moduleId;

    const onSearch = debounce( value => {
        Meteor.call('modules.getModuleOptions', { productId, moduleId, fieldId, mode, value, selectedValues }, (err, options) => {
            if (err) {
                message.error('Es ist ein unbekannter Systemfehler aufgetreten. Bitte wenden Sie sich an den Systemadministrator.' + err.message);
            } else {
                setOptions(options);
            }
            setFetching(false);
        });
    }, 600, false, () => {
        setFetching(true);
    });

    const onChange = v => {        
        let description = '';
        let logoUri = null;

        const found = options.find( i => i._id === v.value );
        
        if (found) {
            description = found.firma1 + ' • ' + found.strasse + ' • ' + found.plz + ' ' + found.ort;
            logoUri = found.logoUri;
        }

        const newItem = { 
            _id: v.value, 
            title: v.label, 
            logoUri: logoUri,
            description,
            link: `/records/${targetProductId}/${targetModuleId}/${v.value}`
        }

        setSelectedValues(
            selectedValues.concat([ newItem ])
        );
        setEnteredValue('');
    }

    return (
        <Fragment>
            <Form.Item 
                label={getLabel(elem)}
                name={elem.field}
                //rules={rules}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={selectedValues}
                    renderItem={ item => 
                        <List.Item >
                            <List.Item.Meta
                                avatar={<Image src={item.logoUri} width={32} />}
                                title={
                                    item.link ? <a href={item.link}>{item.title}</a> : item.titel 
                                }
                                description={item.description}
                            />
                        </List.Item>
                    }
                />

                <Select
                    labelInValue
                    showSearch
                    //mode="multiple"
                    //tagRender={itemRender}
                    value={enteredValue}
                    filterOption={false}
                    onSearch={onSearch}
                    onChange={onChange}
                    loading={fetching}
                    notFoundContent={fetching ? <Spin size="small" /> : null}
                >
                    { options.map( ({ _id, title }) => <Option key={_id} value={_id}>{title}</Option> ) }
                </Select>
            </Form.Item>

        </Fragment>
    )
}
*/

const InlineCombination = ({ elem, mod, mode, onValuesChange }) => {
    return (
        <Row className="ant-form-item" style={{ display: 'flex', flexFlow:'row wrap' }}>
            <Col span={6} className="ant-form-item-label">
                <label>{getLabel(elem, mod.fields)}</label>
            </Col>
            <Col className="ant-form-item-control" style={{ display: 'flex', flexFlow:'row wrap' }}>
                <LayoutElements elements={elem.elements} mod={mod} mode={mode} onValuesChange={onValuesChange} />
            </Col>
        </Row>
    )
}

const OptionInput = ({ elem, mod, mode, onValuesChange }) => {
    const { fields } = mod;
    let { rules } = fields[elem.field];

    if (rules && rules.length) {
        rules = rules.map(r => {
            if (r.customValidator) {
                return eval(r.customValidator);
            }
            return r;
        });
    }
    
    return (
        <Form.Item 
            label={getLabel(elem, mod.fields)}
            name={elem.field}
            rules={rules}
        >            
            <Radio.Group buttonStyle="outline" disabled={mode==='SHOW'}>
                <Space direction="horizontal">
                    { elem.values.map( v => <Radio.Button style={{['--radio-color']:v.color, ['--radio-bgcolor']:v.backgroundColor}} key={v._id} value={v._id} >{v.title}</Radio.Button> )}
                </Space>
            </Radio.Group>
        </Form.Item>
    )
}

const StringInput = ({ elem, mod, mode, onValuesChange }) => {
    const { fields } = mod;
    const { field } = elem;
    let { rules, autoValue } = fields[field];

    if (rules && rules.length) {
        rules = rules.map(r => {
            if (r.customValidator) {
                return eval(r.customValidator);
            }
            return r;
        });
    }
    
    if (autoValue) {
        recomputeValue = eval(autoValue);
        onValuesChange( (changedValues, allValues, setValue) => {            
            const newValue = recomputeValue(changedValues, allValues);
            if (allValues[field] !== newValue)
                setValue(field, newValue);
        })
    }

    return (
        <Form.Item 
            label={getLabel(elem, mod.fields)}
            name={elem.field}
            rules={rules}
        >
            <Input className={mode} disabled={mode==='SHOW'} />
        </Form.Item>
    )
}

const DateInput = ({ elem, mod, mode, onValuesChange }) => {   
    return (
        <Form.Item label={getLabel(elem, mod.fields)}>
            <DatePicker format='DD.MM.YYYY' />
        </Form.Item>
    )
}

const DividerControl = ({ elem, mod, mode, onValuesChange }) => {
    return (
        <Divider orientation={elem.orientation || 'left'} >{elem.title}</Divider>
    );
}

const Collapsible = ({ elem, mod, mode, onValuesChange }) => {
    return (
        <Collapse defaultActiveKey={elem.collapsedByDefault ? ['1'] : null}
            style={{marginBottom:16}}
        >
            <Panel header={getLabel(elem, mod.fields)} key="1">
                <LayoutElements elements={elem.elements} mod={mod} mode={mode} onValuesChange={onValuesChange} />
            </Panel>
        </Collapse>
    );
}

export const ModLayout = ({ product, mod, record, layoutName = 'default', mode, onValuesChange }) => {
    // aktuell wird nur das default-layout unterstützt
    const layout = mod.layouts && (mod.layouts[layoutName] || mod.layouts.default);
    
    return (
        <LayoutElements elements={layout.elements} mod={mod} mode={mode} record={record} onValuesChange={onValuesChange} />
    )
}