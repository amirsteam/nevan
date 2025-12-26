import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';

const ContactScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  // Universal Input Controller
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const submitHandler = (e) => {
    e.preventDefault();
    alert('Thank you for contacting us! We will get back to you soon.');
    // send to backend...
  };

  return (
    <>
      {/* HEADER */}
      <div className='bg-primary text-white py-5 mb-5 text-center'>
        <Container>
          <h1 className='fw-bold'>Get In Touch</h1>
          <p className='lead'>Have questions? We're here to help.</p>
        </Container>
      </div>

      {/* CONTENT */}
      <Container className='mb-5'>
        <Row>
          {/* CONTACT FORM */}
          <Col lg={7} className='mb-4'>
            <Card className='shadow border-0 h-100 bg-white'>
              <Card.Body className='p-4'>
                <h3 className='mb-4 text-primary'>Send Us a Message</h3>

                <Form onSubmit={submitHandler}>
                  <Row>
                    <Col md={6} className='mb-3'>
                      <Form.Group controlId='name'>
                        <Form.Label>Your Name</Form.Label>
                        <Form.Control
                          type='text'
                          placeholder='Enter your name'
                          required
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className='mb-3'>
                      <Form.Group controlId='email'>
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type='email'
                          placeholder='name@example.com'
                          required
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className='mb-3' controlId='subject'>
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      type='text'
                      placeholder='How can we help?'
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Form.Group className='mb-4' controlId='message'>
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={5}
                      placeholder='Write your message here...'
                      required
                      value={formData.message}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <div className='d-grid'>
                    <Button type='submit' variant='success' size='lg'>
                      Send Message
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* SIDE INFO & MAP */}
          <Col lg={5} className='mb-4'>
            <Card className='shadow border-0 h-100 bg-light'>
              <Card.Body className='p-4'>
                <h3 className='mb-4 text-primary'>Contact Information</h3>

                <div className='mb-4 d-flex align-items-start'>
                  <div className='display-6 text-success me-3'>📍</div>
                  <div>
                    <h5 className='fw-bold'>Our Location</h5>
                    <p className='mb-0'>Taukhal, Panauti</p>
                    <p>Kavrepalanchok, Nepal</p>
                  </div>
                </div>

                <div className='mb-4 d-flex align-items-start'>
                  <div className='display-6 text-success me-3'>📧</div>
                  <div>
                    <h5 className='fw-bold'>Email Us</h5>
                    <p>anjanastha101@gmail.com</p>
                  </div>
                </div>

                <div className='mb-4 d-flex align-items-start'>
                  <div className='display-6 text-success me-3'>📞</div>
                  <div>
                    <h5 className='fw-bold'>Call Us</h5>
                    <p>+9779844575932</p>
                  </div>
                </div>

                <hr />

                <h5 className='fw-bold mb-3'>Find Us On Map</h5>
                <div className='ratio ratio-4x3 border rounded overflow-hidden'>
                  <iframe
                    title='Panauti Map'
                    src='https://maps.google.com/maps?q=Taukhal%20Panauti%20Nepal&t=&z=15&ie=UTF8&iwloc=&output=embed'
                    allowFullScreen
                    loading='lazy'
                  ></iframe>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ContactScreen;
